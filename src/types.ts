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
