
export enum UserRole {
  CITIZEN = 'CITIZEN',
  OFFICIAL = 'OFFICIAL'
}

export enum IssueStatus {
  REPORTED = 'Reported',
  ACKNOWLEDGED = 'Acknowledged',
  DISPATCHED = 'Dispatched',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved'
}

export enum Department {
  KSEB = 'KSEB',
  PWD = 'PWD',
  OTHERS = 'Others'
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: Department;
  status: IssueStatus;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  location: string;
  timestamp: string;
  assignedTo?: string;
  imageUrl?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  dept: Department;
  status: 'Online' | 'Offline' | 'Busy';
  workload: number;
  maxWorkload: number;
  location: string;
  avatarUrl: string;
}
