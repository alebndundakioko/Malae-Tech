export interface Report {
  id: string;
  userId: string;
  patientName?: string;
  diagnosis?: string;
  createdAt: any;
  patientData: any;
  reportData?: any;
  type: 'original' | 'story';
  title: string;
  hpcNarrative?: string;
  collaborators?: string[]; // Array of user emails or UIDs
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  hospital?: string;
  medicalSchool?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  medicalCadre?: string;
  specialty?: string;
  issuingCouncil?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationRef?: string;
  studentIdFileName?: string;
  studentIdFileType?: string;
  studentIdBase64?: string;
  role?: string;
  createdAt?: any;
  lastLogin?: any;
  verificationSubmittedAt?: any;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userEmail: string;
  displayName: string;
  medicalSchool: string;
  registrationNumber: string;
  medicalCadre?: string;
  studentIdFileName?: string;
  studentIdFileType?: string;
  studentIdBase64?: string;
  verificationRef: string;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: any;
}
