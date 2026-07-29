import type { Day, Meeting } from "@/lib/availability";

import CAS from "@/CAS.json";
import CDS from "@/CDS.json";
import CFA from "@/CFA.json";
import CGS from "@/CGS.json";
import COM from "@/COM.json";
import ENG from "@/ENG.json";
import GRS from "@/GRS.json";
import LAW from "@/LAW.json";
import MED from "@/MED.json";
import MET from "@/MET.json";
import QST from "@/QST.json";
import SAR from "@/SAR.json";
import SDM from "@/SDM.json";
import SHA from "@/SHA.json";
import SPH from "@/SPH.json";
import SSW from "@/SSW.json";
import STH from "@/STH.json";
import WED from "@/WED.json";

// Room prefixes with no entry in classMap below -- mostly BU Medical Campus
// buildings (72 E Concord St, etc.) and, for MAS specifically, affiliated
// hospitals med students rotate through for clerkships rather than BU rooms.
const EXCLUDED_ROOM_PREFIXES = new Set([
  "MAS",
  "INS",
  "HOU",
  "EVN",
  "CTC",
  "XBG",
  "ABG",
  "GDP",
  "PTH",
  "RBN",
]);

function isExcludedRoom(facilityId: string): boolean {
  const prefix = facilityId.split(/[ _]/)[0];
  return EXCLUDED_ROOM_PREFIXES.has(prefix);
}

const rawMasterList: Meeting[] = [
  ...(CDS as Meeting[]),
  ...(QST as Meeting[]),
  ...(CGS as Meeting[]),
  ...(COM as Meeting[]),
  ...(ENG as Meeting[]),
  ...(CAS as Meeting[]),
  ...(MET as Meeting[]),
  ...(GRS as Meeting[]),
  ...(CFA as Meeting[]),
  ...(SAR as Meeting[]),
  ...(SDM as Meeting[]),
  ...(SHA as Meeting[]),
  ...(LAW as Meeting[]),
  ...(MED as Meeting[]),
  ...(SPH as Meeting[]),
  ...(SSW as Meeting[]),
  ...(STH as Meeting[]),
  ...(WED as Meeting[]),
];

export const masterList: Meeting[] = rawMasterList.filter(
  (meeting) => !isExcludedRoom(meeting.facility_id)
);

export const classMap: Record<string, string> = {
  "All Buildings": "all",
  "African-American Studies": "AAS",
  "Anthropology, Philosophy, Political Science, African Studies Center": "PLS",
  "Babcock Street": "BAB",
  "Biology Research Building": "BRB",
  "CAS Religion": "REL",
  "Center for English Language & Orientation Programs": "EOP",
  "Clinical Psychology": "CLN",
  "College of Arts & Science": "CAS",
  "College of Communication": "COM",
  "College of Engineering": "ENG",
  "College of Fine Arts": "CFA",
  "College of General Studies": "CGS",
  "Engineering Manufacturing Building": "EMB",
  "Engineering Product Innovation Center": "EPC",
  "Engineering Research Annex": "ERA",
  "Engineering Research Building": "ERB",
  "English Faculty Offices": "EGL",
  "Faculty Computing & Data Sci": "CDS",
  "Fitness & Recreation Center": "FRC",
  "Fuller Building": "FLR",
  "Global Development Policy Center": "GDB",
  "History and American Studies": "HIS",
  "International Education Center": "IES",
  "International Relations Building": "IRB",
  "International Relations Center": "IRC",
  "Joan & Edgar Booth Theatre": "THA",
  "Judaic Studies Center": "JSC",
  "Kenmore Classroom Building": "KCB",
  "Life Science & Engineering Building": "LSE",
  "Math & Computer Science": "MCS",
  "Metcalf Science Center": "SCI",
  "Metropolitan College": "MET",
  "Morse Auditorium": "MOR",
  "Mugar Memorial Library": "MUG",
  "Physics Research Building": "PRB",
  "Photonics Building": "PHO",
  Psychology: "PSY",
  "Questrom School of Business": "HAR",
  "Romance Studies, Modern Foreign Languages & Comparative Literature": "LNG",
  "Sargent College": "SAR",
  "School of Hospitality Admin": "SHA",
  "School of Law": "LAW",
  "School of Social Work": "SSW",
  "School of Theology": "STH",
  Sociology: "SOC",
  "Stone Science Building": "STO",
  "Wheelock College of Education": "WED",
  "Yawkey Center for Student Services": "YAW",
};

export const dayMap: Record<string, Day> = {
  Monday: "Mo",
  Tuesday: "Tu",
  Wednesday: "We",
  Thursday: "Th",
  Friday: "Fr",
  Saturday: "Sa",
  Sunday: "Su",
};
