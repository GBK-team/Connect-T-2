export interface NagarsevakDirectoryEntry {
  id: string;
  name: string;
  mobile: string;

  ward: string;
  wardCode?: string | null;

  role: "super_admin" | "nagarsevak";

  isSuperAdmin?: boolean;
}

export const NAGARSEVAK_DIRECTORY: NagarsevakDirectoryEntry[] = [
  {
    id: "SUPER_ADMIN_MAIN",
    name: "Super Admin",
    mobile: "9370796604",

    ward: "All Wards",
    wardCode: null,

    role: "super_admin",
    isSuperAdmin: true,
  },

  {
    id: "NS002",
    name: "Gaikwad Dinesh Dharmadas",
    mobile: "9850784359",
    ward: "Ward 1",
    wardCode: "1",
    role: "nagarsevak",
  },
  {
    id: "NS003",
    name: "Gaikar Sangeeta Kisan",
    mobile: "9011145784",
    ward: "Ward 1",
    wardCode: "1",
    role: "nagarsevak",
  },

  {
    id: "NS004",
    name: "Patil Darshana Umesh",
    mobile: "9021084491",
    ward: "Ward 2",
    wardCode: "2",
    role: "nagarsevak",
  },
  {
    id: "NS005",
    name: "Patil Pradeep Nana",
    mobile: "8806775555",
    ward: "Ward 2",
    wardCode: "2",
    role: "nagarsevak",
  },

  {
    id: "NS006",
    name: "Gaikwad Kabir Naresh",
    mobile: "9673323455",
    ward: "Ward 3",
    wardCode: "3",
    role: "nagarsevak",
  },
  {
    id: "NS007",
    name: "Rasal Archana Charan",
    mobile: "9022223221",
    ward: "Ward 3",
    wardCode: "3",
    role: "nagarsevak",
  },

  {
    id: "NS008",
    name: "Walhekar Meena Suresh",
    mobile: "9527713312",
    ward: "Ward 4",
    wardCode: "4",
    role: "nagarsevak",
  },
  {
    id: "NS009",
    name: "Singh Meenu Ravindra",
    mobile: "9960911330",
    ward: "Ward 4",
    wardCode: "4",
    role: "nagarsevak",
  },

  {
    id: "NS010",
    name: "Walhekar Pawan Suresh",
    mobile: "7666111170",
    ward: "Ward 4",
    wardCode: "4",
    role: "nagarsevak",
  },

  {
    id: "NS011",
    name: "Bhoir Shailesh Shalik",
    mobile: "9921082500",
    ward: "Ward 5",
    wardCode: "5",
    role: "nagarsevak",
  },
  {
    id: "NS012",
    name: "Choube Kiran Pramodkumar",
    mobile: "7756008987",
    ward: "Ward 5",
    wardCode: "5",
    role: "nagarsevak",
  },

  {
    id: "NS013",
    name: "Suve Reshma Dhananjay",
    mobile: "9765979330",
    ward: "Ward 6",
    wardCode: "6",
    role: "nagarsevak",
  },
  {
    id: "NS014",
    name: "Adhav Dilip Bhausaheb",
    mobile: "9850444398",
    ward: "Ward 6",
    wardCode: "6",
    role: "nagarsevak",
  },

  {
    id: "NS015",
    name: "Bagul Sunita Rajendra",
    mobile: "9322817982",
    ward: "Ward 7",
    wardCode: "7",
    role: "nagarsevak",
  },
  {
    id: "NS016",
    name: "Karanjule Ravindra Sarjerao",
    mobile: "9960359151",
    ward: "Ward 7",
    wardCode: "7",
    role: "nagarsevak",
  },

  {
    id: "NS017",
    name: "Gejage Rupali Vinayak",
    mobile: "8446717020",
    ward: "Ward 8",
    wardCode: "8",
    role: "nagarsevak",
  },
  {
    id: "NS018",
    name: "Walhekar Rajendra Shivling",
    mobile: "9320055999",
    ward: "Ward 8",
    wardCode: "8",
    role: "nagarsevak",
  },

  {
    id: "NS019",
    name: "Patil Tejaswini Milind",
    mobile: "8767782830",
    ward: "Ward 9",
    wardCode: "9",
    role: "nagarsevak",
  },
  {
    id: "NS020",
    name: "Rathod Kiran Badrinath",
    mobile: "9766317928",
    ward: "Ward 9",
    wardCode: "9",
    role: "nagarsevak",
  },

  {
    id: "NS021",
    name: "Gaikwad Deepa Ajit",
    mobile: "8208825107",
    ward: "Ward 10",
    wardCode: "10",
    role: "nagarsevak",
  },
  {
    id: "NS022",
    name: "Someshwar Vikas Hemraj",
    mobile: "9767777816",
    ward: "Ward 10",
    wardCode: "10",
    role: "nagarsevak",
  },

  {
    id: "NS023",
    name: "Devde Sanjivani Rahul",
    mobile: "8626066620",
    ward: "Ward 11",
    wardCode: "11",
    role: "nagarsevak",
  },
  {
    id: "NS024",
    name: "Patil Vipul Pradeep",
    mobile: "8600353575",
    ward: "Ward 11",
    wardCode: "11",
    role: "nagarsevak",
  },

  {
    id: "NS025",
    name: "Mhatre Manish Shantaram",
    mobile: "8007471204",
    ward: "Ward 12",
    wardCode: "12",
    role: "nagarsevak",
  },
  {
    id: "NS026",
    name: "Jaishankar Dhanlakshmi Jaishankar",
    mobile: "9860468905",
    ward: "Ward 12",
    wardCode: "12",
    role: "nagarsevak",
  },

  {
    id: "NS027",
    name: "Patil Harshada Pankaj",
    mobile: "7789894848",
    ward: "Ward 13",
    wardCode: "13",
    role: "nagarsevak",
  },
  {
    id: "NS028",
    name: "Abdul Gulampir Sheikh",
    mobile: "9890215411",
    ward: "Ward 13",
    wardCode: "13",
    role: "nagarsevak",
  },

  {
    id: "NS029",
    name: "Bharade Sandeep Vasant",
    mobile: "8087174533",
    ward: "Ward 14",
    wardCode: "14",
    role: "nagarsevak",
  },
  {
    id: "NS030",
    name: "Gore Alpana Yogesh",
    mobile: "9326032074",
    ward: "Ward 14",
    wardCode: "14",
    role: "nagarsevak",
  },

  {
    id: "NS031",
    name: "Karanjule Abhijeet Gulabrao",
    mobile: "8888443000",
    ward: "Ward 15",
    wardCode: "15",
    role: "nagarsevak",
  },
  {
    id: "NS032",
    name: "Thete Vaishali Jagdish",
    mobile: "9156133066",
    ward: "Ward 15",
    wardCode: "15",
    role: "nagarsevak",
  },

  {
    id: "NS033",
    name: "Telange Sandeep Ananta",
    mobile: "8424979999",
    ward: "Ward 16",
    wardCode: "16",
    role: "nagarsevak",
  },
  {
    id: "NS034",
    name: "Bhoir Rohini Manish",
    mobile: "8390309400",
    ward: "Ward 16",
    wardCode: "16",
    role: "nagarsevak",
  },

  {
    id: "NS035",
    name: "Shelar Meera Vinod",
    mobile: "7387199208",
    ward: "Ward 17",
    wardCode: "17",
    role: "nagarsevak",
  },
  {
    id: "NS036",
    name: "Patil Sadashiv Hender",
    mobile: "9765986777",
    ward: "Ward 17",
    wardCode: "17",
    role: "nagarsevak",
  },

  {
    id: "NS037",
    name: "Manchekar Shamala Mallappa",
    mobile: "7620845775",
    ward: "Ward 18",
    wardCode: "18",
    role: "nagarsevak",
  },
  {
    id: "NS038",
    name: "Mohorikar Amruta Ajay",
    mobile: "9822596182",
    ward: "Ward 18",
    wardCode: "18",
    role: "nagarsevak",
  },

  {
    id: "NS039",
    name: "Ugle Veena Purushottam",
    mobile: "9320018200",
    ward: "Ward 19",
    wardCode: "19",
    role: "nagarsevak",
  },
  {
    id: "NS040",
    name: "Choudhari Nikhil Sunil",
    mobile: "9960799845",
    ward: "Ward 19",
    wardCode: "19",
    role: "nagarsevak",
  },

  {
    id: "NS041",
    name: "Bhoir Kunal Subhash",
    mobile: "9322380174",
    ward: "Ward 20",
    wardCode: "20",
    role: "nagarsevak",
  },
  {
    id: "NS042",
    name: "Aparna Kunal Bhoir",
    mobile: "7666581008",
    ward: "Ward 20",
    wardCode: "20",
    role: "nagarsevak",
  },

  {
    id: "NS043",
    name: "Phulore Mahesh Kathod",
    mobile: "8888800099",
    ward: "Ward 21",
    wardCode: "21",
    role: "nagarsevak",
  },
  {
    id: "NS044",
    name: "Jyotsana Chandrakant Bhoir",
    mobile: "7507473278",
    ward: "Ward 21",
    wardCode: "21",
    role: "nagarsevak",
  },

  {
    id: "NS045",
    name: "Bhoir Sujata Dilip",
    mobile: "8888667606",
    ward: "Ward 22",
    wardCode: "22",
    role: "nagarsevak",
  },
  {
    id: "NS046",
    name: "Bhoir Anita Prakash",
    mobile: "9371117801",
    ward: "Ward 22",
    wardCode: "22",
    role: "nagarsevak",
  },

  {
    id: "NS047",
    name: "Lakade Pallavi Sandeep",
    mobile: "9769961156",
    ward: "Ward 23",
    wardCode: "23",
    role: "nagarsevak",
  },
  {
    id: "NS048",
    name: "Manesh Namdev Gunjal",
    mobile: "7276414243",
    ward: "Ward 23",
    wardCode: "23",
    role: "nagarsevak",
  },

  {
    id: "NS049",
    name: "Kotekar Ranjana Deepak",
    mobile: "8149887060",
    ward: "Ward 24",
    wardCode: "24",
    role: "nagarsevak",
  },
  {
    id: "NS050",
    name: "Bagul Swapnil Arun",
    mobile: "8888613076",
    ward: "Ward 24",
    wardCode: "24",
    role: "nagarsevak",
  },

  {
    id: "NS051",
    name: "Waringe Pandurinath Lakshman",
    mobile: "7083315590",
    ward: "Ward 25",
    wardCode: "25",
    role: "nagarsevak",
  },
  {
    id: "NS052",
    name: "Gudekar Reshma Sameer",
    mobile: "8793411415",
    ward: "Ward 25",
    wardCode: "25",
    role: "nagarsevak",
  },

  {
    id: "NS053",
    name: "Patil Sunita Tanaji",
    mobile: "9860434322",
    ward: "Ward 26",
    wardCode: "26",
    role: "nagarsevak",
  },
  {
    id: "NS054",
    name: "Patil Sachin Sadashiv",
    mobile: "9096123777",
    ward: "Ward 26",
    wardCode: "26",
    role: "nagarsevak",
  },

  {
    id: "NS055",
    name: "Patil Swati Atish",
    mobile: "7350211200",
    ward: "Ward 27",
    wardCode: "27",
    role: "nagarsevak",
  },
  {
    id: "NS056",
    name: "Gunjal Sachin Shantaram",
    mobile: "9637629894",
    ward: "Ward 27",
    wardCode: "27",
    role: "nagarsevak",
  },

  {
    id: "NS057",
    name: "Rinjad Monika Shridhar",
    mobile: "8425835353",
    ward: "Ward 28",
    wardCode: "28",
    role: "nagarsevak",
  },
  {
    id: "NS058",
    name: "Patil Punam Rakesh",
    mobile: "9011453148",
    ward: "Ward 28",
    wardCode: "28",
    role: "nagarsevak",
  },

  {
    id: "NS059",
    name: "Waghe Sunil Balhiram",
    mobile: "8108575901",
    ward: "Ward 29",
    wardCode: "29",
    role: "nagarsevak",
  },
  {
    id: "NS060",
    name: "Sorkhade Payal Kishor",
    mobile: "7888188545",
    ward: "Ward 29",
    wardCode: "29",
    role: "nagarsevak",
  },

  {
    id: "NS061",
    name: "Vishwajeet Gulabrao Karanjule",
    mobile: "8390574735",
    ward: "Nominated Member",
    wardCode: null,
    role: "nagarsevak",
  },
  {
    id: "NS062",
    name: "Umesh Ananta Patil",
    mobile: "9822982976",
    ward: "Nominated Member",
    wardCode: null,
    role: "nagarsevak",
  },
  {
    id: "NS063",
    name: "Maruti Amruta Dere",
    mobile: "9552958979",
    ward: "Nominated Member",
    wardCode: null,
    role: "nagarsevak",
  },
  {
    id: "NS064",
    name: "Subhash Narayan Salunkhe",
    mobile: "9322392209",
    ward: "Nominated Member",
    wardCode: null,
    role: "nagarsevak",
  },
  {
    id: "NS065",
    name: "Rohit Raju Mahadik",
    mobile: "9921112244",
    ward: "Nominated Member",
    wardCode: null,
    role: "nagarsevak",
  },
];

export function findNagarsevakById(
  id: string,
): NagarsevakDirectoryEntry | undefined {
  const normalized = id.toUpperCase().trim();

  return NAGARSEVAK_DIRECTORY.find((n) => n.id.toUpperCase() === normalized);
}

export function findNagarsevakByMobile(
  mobile: string,
): NagarsevakDirectoryEntry | undefined {
  const normalized = mobile.replace(/\D/g, "");

  return NAGARSEVAK_DIRECTORY.find(
    (n) => n.mobile.replace(/\D/g, "") === normalized,
  );
}

export function findNagarsevakByWardCode(
  wardCode: string,
): NagarsevakDirectoryEntry | undefined {
  return NAGARSEVAK_DIRECTORY.find((n) => n.wardCode === wardCode);
}
