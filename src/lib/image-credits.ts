// Attribution for the real photography used across the site. Every image is a
// genuine photograph sourced from Wikimedia Commons under a free licence — no
// AI-generated imagery. Keep this list in sync when swapping photos.
export type ImageCredit = {
  label: string;
  file: string;
  author: string;
  license: string;
  page: string;
};

export const IMAGE_CREDITS: ImageCredit[] = [
  { label: "Airport transfers", file: "Departures Terminal 5, London Heathrow Airport (33215594911).jpg", author: "Andrew Milligan sumo", license: "CC BY 2.0", page: "https://commons.wikimedia.org/wiki/File:Departures_Terminal_5,_London_Heathrow_Airport_(33215594911).jpg" },
  { label: "Corporate travel", file: "MERCEDES-BENZ S-CLASS (W223) China (18).jpg", author: "Dinkun Chen", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:MERCEDES-BENZ_S-CLASS_(W223)_China_(18).jpg" },
  { label: "Tours", file: "Stonehenge from the north.jpg", author: "Sumit Surai", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Stonehenge_from_the_north.jpg" },
  { label: "Sports travel", file: "London Wembley.jpg", author: "Arne M\u00fcseler", license: "CC BY-SA 3.0 de", page: "https://commons.wikimedia.org/wiki/File:London_Wembley.jpg" },
  { label: "Group travel", file: "Brent Dialaride.jpg", author: "David Howard from Kingsbury, England", license: "CC BY 2.0", page: "https://commons.wikimedia.org/wiki/File:Brent_Dialaride.jpg" },
  { label: "Coach hire", file: "Golders Green Bus Station - National Express Coach - Airport Express (16022118528).jpg", author: "Elliott Brown from Birmingham, United Kingdom", license: "CC BY-SA 2.0", page: "https://commons.wikimedia.org/wiki/File:Golders_Green_Bus_Station_-_National_Express_Coach_-_Airport_Express_(16022118528).jpg" },
  { label: "Cruise transfers", file: "Fred Olsen 'Bolette' cruise ship in the Southampton Terminal - geograph.org.uk - 7755396.jpg", author: "John Lucas", license: "CC BY-SA 2.0", page: "https://commons.wikimedia.org/wiki/File:Fred_Olsen_'Bolette'_cruise_ship_in_the_Southampton_Terminal_-_geograph.org.uk_-_7755396.jpg" },
  { label: "Hospital transport", file: "Llandough Hospital, main entrance - geograph.org.uk - 1737736.jpg", author: "John Lord", license: "CC BY-SA 2.0", page: "https://commons.wikimedia.org/wiki/File:Llandough_Hospital,_main_entrance_-_geograph.org.uk_-_1737736.jpg" },
  { label: "University travel", file: "Radcliffe Camera, Oxford - Oct 2006.jpg", author: "Diliff", license: "CC BY 2.5", page: "https://commons.wikimedia.org/wiki/File:Radcliffe_Camera,_Oxford_-_Oct_2006.jpg" },
  { label: "Long distance", file: "A1 dual carriageway towards the south at dusk 0001 - geograph.org.uk - 6796241.jpg", author: "Andrew Tatlow", license: "CC BY-SA 2.0", page: "https://commons.wikimedia.org/wiki/File:A1_dual_carriageway_towards_the_south_at_dusk_0001_-_geograph.org.uk_-_6796241.jpg" },
  { label: "Minibus hire", file: "2016 Mercedes-Benz Sprinter Super High Minibus, front right.jpg", author: "Ethan Llamas", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2016_Mercedes-Benz_Sprinter_Super_High_Minibus,_front_right.jpg" },
  { label: "Station transfers", file: "Booking Office, St Pancras International Station, NW1 (6296266282).jpg", author: "Ewan Munro from London, UK", license: "CC BY-SA 2.0", page: "https://commons.wikimedia.org/wiki/File:Booking_Office,_St_Pancras_International_Station,_NW1_(6296266282).jpg" },
  { label: "Events travel", file: "Albert Hall Auditorium (1733170619).jpg", author: "Amanda Slater from Coventry, West Midlands, UK", license: "CC BY-SA 2.0", page: "https://commons.wikimedia.org/wiki/File:Albert_Hall_Auditorium_(1733170619).jpg" },
  { label: "VIP travel", file: "2023 Rolls-Royce Phantom.jpg", author: "Calreyn88", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2023_Rolls-Royce_Phantom.jpg" },
  { label: "Executive saloon (feature)", file: "Mercedes-Benz & Maybach Type 223 S-Class (1).jpg", author: "Damian B Oh", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Mercedes-Benz_&_Maybach_Type_223_S-Class_(1).jpg" },
  { label: "Edinburgh", file: "Castle, City of Edinburgh (IMG 20190628 180330).jpg", author: "Matti Blume", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Castle,_City_of_Edinburgh_(IMG_20190628_180330).jpg" },
  { label: "Economy saloon", file: "2015-2018 Toyota Prius S.jpg", author: "TTTNIS", license: "CC0", page: "https://commons.wikimedia.org/wiki/File:2015-2018_Toyota_Prius_S.jpg" },
  { label: "Standard saloon", file: "2016-2018 Volkswagen Passat SE.jpg", author: "MercurySable99", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2016-2018_Volkswagen_Passat_SE.jpg" },
  { label: "Executive saloon", file: "2021 Mercedes-Benz E-Class E300e Avantgarde.jpg", author: "Chanokchon", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2021_Mercedes-Benz_E-Class_E300e_Avantgarde.jpg" },
  { label: "Luxury saloon", file: "MERCEDES MAYBACH S-CLASS (W223) China (13).jpg", author: "Dinkun Chen", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:MERCEDES_MAYBACH_S-CLASS_(W223)_China_(13).jpg" },
  { label: "Estate car", file: "Mercedes-Benz E-Class (W213) Estate, 2017.jpg", author: "MARIA CLARISSA FIONALITA", license: "CC BY 2.0", page: "https://commons.wikimedia.org/wiki/File:Mercedes-Benz_E-Class_(W213)_Estate,_2017.jpg" },
  { label: "Standard MPV", file: "VW Touran II. Facelift front 20100814.jpg", author: "M 93", license: "Attribution", page: "https://commons.wikimedia.org/wiki/File:VW_Touran_II._Facelift_front_20100814.jpg" },
  { label: "Seven seater MPV", file: "2018 Ford Tourneo.jpg", author: "Hugh Llewelyn", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2018_Ford_Tourneo.jpg" },
  { label: "Premium MPV", file: "2019 Mercedes-Benz V-Class (W447) 1X7A1743.jpg", author: "Alexander-93", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2019_Mercedes-Benz_V-Class_(W447)_1X7A1743.jpg" },
  { label: "Eight seater van", file: "2018 Mercedes-Benz Vito 114 Bluetec Tourer Select 2.1.jpg", author: "Vauxford", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2018_Mercedes-Benz_Vito_114_Bluetec_Tourer_Select_2.1.jpg" },
  { label: "Executive minibus", file: "2016 Mercedes-Benz Sprinter Super High Minibus, front right.jpg", author: "Ethan Llamas", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2016_Mercedes-Benz_Sprinter_Super_High_Minibus,_front_right.jpg" },
  { label: "Coach", file: "Doelen Coach Service Mercedes-Benz Tourismo 09-BDR-6 22-07-2022.jpg", author: "Robbie Klinkenberg", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Doelen_Coach_Service_Mercedes-Benz_Tourismo_09-BDR-6_22-07-2022.jpg" },
  { label: "Wheelchair accessible", file: "Accesibilidad en el transporte - afg4278.jpg", author: "Valent\u00edn R\u00edo", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Accesibilidad_en_el_transporte_-_afg4278.jpg" },
  { label: "Electric saloon", file: "Gibraltar G1 Tesla Motors Model S.jpg", author: "Tonyevans gi", license: "CC BY-SA 3.0", page: "https://commons.wikimedia.org/wiki/File:Gibraltar_G1_Tesla_Motors_Model_S.jpg" },
  { label: "Electric MPV", file: "2024 Mercedes-Benz EQV DSC 7336.jpg", author: "Alexander Migl", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2024_Mercedes-Benz_EQV_DSC_7336.jpg" },
  { label: "Luxury SUV", file: "Land Rover Range Rover Autobiography L L460 Santorini Black (1).jpg", author: "Damian B Oh", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Land_Rover_Range_Rover_Autobiography_L_L460_Santorini_Black_(1).jpg" },
  { label: "Ultra luxury saloon", file: "2023 Rolls-Royce Phantom.jpg", author: "Calreyn88", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2023_Rolls-Royce_Phantom.jpg" },
  { label: "Coaster bus", file: "A Toyota Coaster Bus in Beijing 2013.jpg", author: "Bernhard Wintersperger", license: "CC BY 2.0", page: "https://commons.wikimedia.org/wiki/File:A_Toyota_Coaster_Bus_in_Beijing_2013.jpg" },
];
