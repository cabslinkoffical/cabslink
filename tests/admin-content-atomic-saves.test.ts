import { describe, it, expect, vi } from 'vitest';
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => { const b: any = { middleware: () => b, inputValidator: (v: any) => { b.validate = v; return b; }, handler: (h: any) => (args: any) => h({ ...args, data: b.validate ? b.validate(args.data) : args.data }) }; return b; } }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
import { upsertPost, listAdminPosts } from '@/lib/blog-admin.functions';
import { upsertExtra } from '@/lib/extras.functions';
import { deleteMedia } from '@/lib/media.functions';
const id = '11111111-1111-4111-8111-111111111111';
const related = '22222222-2222-4222-8222-222222222222';
const context = (rpc: any, from = vi.fn()) => ({ userId: id, supabase: { rpc, from } });
describe('A05 blog transactional orchestration', () => {
 it('round-trips related IDs and omits unmanaged IDs', async () => {
  const rpc = vi.fn(async (name, args) => ({data: name === 'has_role' ? true : id, error: null}));
  for (const extra of [{related_post_ids:[related]}, {}]) {
   await (upsertPost as any)({context:context(rpc),data:{id,slug:'sample',title:'Sample', ...extra}});
   const payload = rpc.mock.calls.at(-1)![1].p_post;
   expect(payload.related_post_ids).toEqual((extra as any).related_post_ids);
   if (!('related_post_ids' in extra)) expect(Object.hasOwn(payload,'related_post_ids')).toBe(false);
  }
 });
 it('rejects failed atomic save without separate article or tag writes', async () => {
  const from = vi.fn(); const previous = {title:'Old',tags:[related]};
  const rpc = vi.fn(async (name) => name === 'has_role' ? {data:true} : {error:{message:'tag insert failed'}});
  await expect((upsertPost as any)({context:context(rpc,from),data:{id,slug:'sample',title:'Changed'}})).rejects.toThrow('tag insert failed');
  expect(from).not.toHaveBeenCalled(); expect(previous).toEqual({title:'Old',tags:[related]});
 });
});
describe('A01 server search', () => {
 it('filters before paging and uses exact count and stable ordering', async () => {
  const calls: any[]=[]; const q:any={};
  for (const k of ['select','order','or','range']) q[k]=vi.fn((...a:any[])=>{calls.push([k,...a]);return q;});
  q.then=(resolve:any)=>resolve({data:[{id,title:'Beyond original first page'}],count:51,error:null});
  const from=vi.fn(()=>q);
  const res=await (listAdminPosts as any)({context:context(vi.fn(async()=>({data:true})),from),data:{search:'Beyond',offset:25,limit:25}});
  expect(res.total).toBe(51); expect(res.items[0].id).toBe(id);
  expect(calls.findIndex(c=>c[0]==='or')).toBeLessThan(calls.findIndex(c=>c[0]==='range'));
  expect(q.range).toHaveBeenCalledWith(25,49);expect(q.order).toHaveBeenCalledWith('id',{ascending:false});
  expect(q.select.mock.calls[0][1]).toEqual({count:'exact'});
 });
});
describe('A07 extras atomic orchestration', () => {
 for(const all of [true,false]) it(`rejects replacement failure, all classes=${all}`, async()=>{
  const from=vi.fn(); const rpc=vi.fn(async(name)=>name==='has_role'?{data:true}:{error:{message:'link insert failed'}});
  await expect((upsertExtra as any)({context:context(rpc,from),data:{key:'test_extra',name:'Test extra',price_pence:100,price_basis:'per_unit',max_quantity:2,applies_to_all_classes:all,active:true,sort_order:1,class_ids:[related],class_prices:{[related]:200}}})).rejects.toThrow('link insert failed');
  expect(from).not.toHaveBeenCalled();expect(rpc.mock.calls.at(-1)![1].p_links).toEqual([{vehicle_class_id:related,price_pence:200,max_quantity:null}]);
 });
});
function mediaMock(failure?:string){
 let references=2;let row=true;let storageExists=true;const events:string[]=[];
 const remove=vi.fn(async()=>{events.push('storage');if(failure==='storage'){failure=undefined;return {error:{message:'offline'}};}if(!storageExists)return {error:{statusCode:'404'}};storageExists=false;return {error:null};});
 const from=vi.fn((table:string)=>{
  let op='read';let col='';const q:any={};
  for(const k of ['select','in','limit'])q[k]=()=>q;
  q.eq=(c:string)=>{if(c!=='id')col=c;return q;};q.update=()=>{op='update';return q;};q.delete=()=>{op='delete';return q;};
  q.then=(resolve:any)=>{
   if(table==='media_assets') {if(op==='delete'){events.push('delete');row=false;return resolve({error:null});}return resolve({data:row?[{id,path:'test.webp',url:'https://example.com/test.webp',source_kind:'upload'}]:[],error:null});}
   if(op==='update'){events.push('clear');if(failure==='update')return resolve({error:{message:'update failed'}});references--;return resolve({data:[{id}],error:null});}
   if(failure==='scan')return resolve({error:{message:'scan failed'}});
   return resolve({data:table==='blog_posts'&&col==='featured_image_url'?Array.from({length:references},(_,i)=>({id:String(i),title:'Post'})):[],error:null});
  };return q;
 });
 const ctx=context(vi.fn(async()=>({data:true})),from);(ctx.supabase as any).storage={from:()=>({remove})};
 return {ctx,events,remove,row:()=>row};
}
describe('A08 fail-closed deletion',()=>{
 for(const failure of ['scan','update','storage'])it(`preserves asset row on ${failure} failure`,async()=>{
  const m=mediaMock(failure);await expect((deleteMedia as any)({context:m.ctx,data:{ids:[id],clearReferences:true}})).rejects.toThrow();
  expect(m.row()).toBe(true);expect(m.events).not.toContain('delete');if(failure!=='storage')expect(m.remove).not.toHaveBeenCalled();
 });
 it('clears multiple refs before storage and supports retry after a storage failure',async()=>{
  const m=mediaMock('storage');const args={context:m.ctx,data:{ids:[id],clearReferences:true}};
  await expect((deleteMedia as any)(args)).rejects.toThrow('offline');await (deleteMedia as any)(args);
  expect(m.events).toEqual(['clear','clear','storage','storage','delete']);expect(m.row()).toBe(false);
 });
 it('does not remove referenced assets without confirmation',async()=>{
  const m=mediaMock();await expect((deleteMedia as any)({context:m.ctx,data:{ids:[id]}})).rejects.toThrow('still used');expect(m.remove).not.toHaveBeenCalled();
 });
});
