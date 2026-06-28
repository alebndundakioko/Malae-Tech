/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useId, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  pdf, 
  Font 
} from '@react-pdf/renderer';
import { 
  User as UserIcon, 
  Zap, 
  Clock, 
  Stethoscope as StethoscopeIcon, 
  ClipboardList, 
  Scissors, 
  Users, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  Menu,
  X,
  BookOpen,
  Download,
  Save,
  LogOut,
  LayoutDashboard,
  Plus,
  AlertCircle,
  Check,
  Calendar,
  Sparkles,
  Mic,
  MicOff,
  FileUp,
  History,
  Edit,
  Baby,
  Activity,
  FlaskConical,
  Syringe,
  HeartPulse,
  Microscope,
  CircleDot,
  Bone
} from 'lucide-react';

// Firebase imports
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDocFromServer, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { Report } from './types';

// Component imports
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Profile } from './components/Profile';
import { Loader } from './components/Loader';

import pptxgen from "pptxgenjs";

// --- Types ---

type StepId = 
  | 'specialty'
  | 'input_history'
  | 'physical_exam'
  | 'compiled_report'
  | 'generate_output'
  | 'ai_suggestions';

interface Step {
  id: StepId;
  label: string;
  icon: any;
  title: string;
  subtitle: string;
}

// --- Constants ---

const SPECIALTY_MAP = [
  { id: 'Internal Medicine', label: 'Internal Medicine', icon: StethoscopeIcon, color: 'from-blue-500 to-indigo-600', description: 'Internal Medicine and systemic clinical care.' },
  { id: 'Pediatrics', label: 'Pediatrics', icon: Baby, color: 'from-amber-400 to-orange-500', description: 'Paediatrics and adolescent clinical medicine.' },
  { id: 'Obstetrics & Gynecology', label: 'Obstetrics & Gynecology', icon: Microscope, color: 'from-emerald-500 to-teal-600', description: 'Reproductive health, maternal medicine, and childbirth.' },
  { id: 'Surgery', label: 'Surgery', icon: Syringe, color: 'from-rose-500 to-pink-600', description: 'Pre-op, intraprocedure, and postoperative surgical cases.' }
];

const SPECIALTIES = SPECIALTY_MAP.map(s => s.id);

const STEPS: Step[] = [
  { 
    id: 'specialty', 
    label: 'Specialty', 
    icon: LayoutDashboard, 
    title: 'Select Specialty', 
    subtitle: 'Step 0: Select the clinical department for this case.' 
  },
  { 
    id: 'input_history', 
    label: 'Input History', 
    icon: ClipboardList, 
    title: 'Input Patient History', 
    subtitle: 'Step 1: Upload notes, dictate audio, or type clinical history.' 
  },
  { 
    id: 'physical_exam', 
    label: 'Physical Exam', 
    icon: StethoscopeIcon, 
    title: 'Physical Examination', 
    subtitle: 'Step 2: Add optional focused examination findings.' 
  },
  { 
    id: 'compiled_report', 
    label: 'Compiled Report', 
    icon: CheckCircle2, 
    title: 'Compiled Case Report', 
    subtitle: 'Step 3: Check raw clinical data vs structured compilation.' 
  },
  { 
    id: 'generate_output', 
    label: 'Generate Output', 
    icon: FileText, 
    title: 'Generate Clinical Outputs', 
    subtitle: 'Step 4: Download PowerPoint, Word summaries, or listen to audio syntheses.' 
  },
  { 
    id: 'ai_suggestions', 
    label: 'AI Suggestions', 
    icon: Sparkles, 
    title: 'AI Clinical Suggestions', 
    subtitle: 'Step 5: Review machine-recommended diagnostics and investigations.' 
  }
];

// --- Components ---

const InputField = ({ label, placeholder, type = "text", value, onChange, required, onVoiceInput, isRecording, isTranscribing, recordingTimeLeft }: any) => {
  const id = useId();
  return (
    <div className="flex flex-col gap-1 sm:gap-1.5 w-full group">
      <label htmlFor={id} className="text-[9px] sm:text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] group-focus-within:text-primary transition-colors">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-line bg-surface text-sm sm:text-base text-text-main placeholder:text-text-muted/30 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm hover:border-line/80"
        />
        <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2">
          {isTranscribing && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary/5 rounded-lg">
              <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin text-primary" />
              <span className="text-[7px] sm:text-[8px] font-bold text-primary uppercase tracking-tighter">Transcribing</span>
            </div>
          )}
          {onVoiceInput && !isTranscribing && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isRecording && recordingTimeLeft !== undefined && (
                <span className={`text-[9px] sm:text-[10px] font-black tabular-nums ${recordingTimeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-text-muted'}`}>
                  0:{recordingTimeLeft.toString().padStart(2, '0')}
                </span>
              )}
              <button 
                type="button"
                onClick={onVoiceInput}
                aria-label={isRecording ? `Stop recording ${label}` : `Start recording ${label}`}
                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${isRecording ? 'bg-red-50 text-red-500 shadow-lg shadow-red-100' : 'text-text-muted hover:text-primary hover:bg-primary/5'}`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" /> : <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TextAreaField = ({ label, placeholder, value, onChange, required, onVoiceInput, isRecording, isTranscribing, recordingTimeLeft }: any) => {
  const id = useId();
  return (
    <div className="flex flex-col gap-1 sm:gap-1.5 w-full group">
      <label htmlFor={id} className="text-[9px] sm:text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] group-focus-within:text-primary transition-colors">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <textarea
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          rows={4}
          className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-line bg-surface text-sm sm:text-base text-text-main placeholder:text-text-muted/30 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm hover:border-line/80 min-h-[100px] sm:min-h-[120px]"
        />
        <div className="absolute right-3 sm:right-4 bottom-3 sm:bottom-4 flex items-center gap-1.5 sm:gap-2">
          {isTranscribing && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary/5 rounded-lg">
              <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin text-primary" />
              <span className="text-[7px] sm:text-[8px] font-bold text-primary uppercase tracking-tighter">Transcribing</span>
            </div>
          )}
          {onVoiceInput && !isTranscribing && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isRecording && recordingTimeLeft !== undefined && (
                <span className={`text-[9px] sm:text-[10px] font-black tabular-nums ${recordingTimeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-text-muted'}`}>
                  0:{recordingTimeLeft.toString().padStart(2, '0')}
                </span>
              )}
              <button 
                type="button"
                onClick={onVoiceInput}
                aria-label={isRecording ? `Stop recording ${label}` : `Start recording ${label}`}
                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${isRecording ? 'bg-red-50 text-red-500 shadow-lg shadow-red-100' : 'text-text-muted hover:text-primary hover:bg-primary/5'}`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" /> : <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SelectField = ({ label, options, value, onChange, required }: any) => {
  const id = useId();
  return (
    <div className="flex flex-col gap-1 sm:gap-1.5 w-full group">
      <label htmlFor={id} className="text-[9px] sm:text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] group-focus-within:text-primary transition-colors">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-line bg-surface text-sm sm:text-base text-text-main focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm hover:border-line/80 appearance-none cursor-pointer pr-10 sm:pr-12"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '0.875rem' }}
        >
          <option value="">Select an option</option>
          {options.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

const FileUpload = ({ label, subtitle, onFileSelect, isProcessing }: any) => {
  const id = useId();
  return (
    <div className="flex flex-col gap-1 sm:gap-1.5 w-full">
      <span className="text-[9px] sm:text-[10px] font-bold text-text-muted uppercase tracking-wider">
        {label}
      </span>
      <label 
        htmlFor={id}
        className={`w-full border-2 border-dashed border-line rounded-xl sm:rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center gap-2 sm:gap-3 bg-surface/30 hover:bg-surface/50 transition-colors cursor-pointer group ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input 
          id={id}
          type="file" 
          className="hidden" 
          accept="image/*,.pdf" 
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
          disabled={isProcessing}
        />
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-surface shadow-sm flex items-center justify-center text-text-muted group-hover:text-primary transition-colors">
          {isProcessing ? <Loader size="sm" /> : <Upload className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />}
        </div>
        <div className="text-center">
          <p className="text-xs sm:text-sm font-bold text-text-main">{isProcessing ? 'Processing...' : label}</p>
          <p className="text-[8px] sm:text-[10px] text-text-muted uppercase tracking-tight">{subtitle}</p>
        </div>
      </label>
    </div>
  );
};

// --- PDF Styles ---

const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 20,
    marginBottom: 30,
  },
  brand: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  reportType: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  meta: {
    textAlign: 'right',
  },
  date: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
  },
  stepLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  titleSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  content: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  fullWidth: {
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 10,
    color: '#334155',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  systemSection: {
    marginBottom: 20,
  },
  systemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  systemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4A5A5',
    marginRight: 6,
  },
  systemTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Story Report Specific Styles
  coverPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  coverTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  coverTopic: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 40,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#334155',
    marginBottom: 10,
    textAlign: 'justify',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 10,
  },
  bullet: {
    width: 15,
    fontSize: 10,
  },
  listContent: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
    color: '#334155',
  },
});

// --- PDF Document Components ---

const getCaseWriteUpPrompt = (formData: any) => {
  const patientName = formData.fullName || 'Unidentified Patient';
  const patientAge = formData.age || 'Adult';
  const patientSex = formData.sex || 'Unknown';
  const specialty = formData.specialty || 'General Medicine';

  const fshDetailsCombined = `
    - Family Hereditary Conditions: ${formData.fsh_hereditary || 'Not specified'}
    - Home Sanitation & Clean Water Access: ${formData.fsh_sanitation || 'Not specified'}
    - Parents' Employment & Financial Support: ${formData.fsh_employment || 'Not specified'}
    - General Family & Social narrative: ${formData.familySocialHistory || 'No additional details.'}
  `.trim();

  const physicalDetailsCombined = `
    - Vital Signs Parameters:
      * Blood Pressure: ${formData.vitals_bp || 'Not measured'}
      * Pulse Rate: ${formData.vitals_pulse || 'Not measured'} bpm
      * Body Temperature: ${formData.vitals_temp || 'Not measured'} °C
      * Respiratory Rate: ${formData.vitals_rr || 'Not measured'} /min
      * Oxygen Saturation (SpO2): ${formData.vitals_spo2 || 'Not measured'}
    - General Exam (Pallor, Lymphs, Hydration, Icterus, Oedema): ${formData.phys_general_exam || 'Not specified'}
    - Respiratory System Examination: ${formData.phys_respiratory || 'Not specified'}
    - Central Nervous System (CNS) Neurological Examination: ${formData.phys_cns || 'Not specified'}
    - Cardiovascular System (CVS) Examination: ${formData.phys_cvs || 'Not specified'}
    - Gastrointestinal or Abdominal Examination: ${formData.phys_abdomen || 'Not specified'}
    - Comprehensive/Additional physical examination details: ${formData.physicalExam || 'No additional details.'}
  `.trim();

  const hpcDetailsCombined = `
    ${formData.historyInput || 'No direct text narrative history recorded yet.'}
    ${formData.onset ? `- Onset: ${formData.onset}` : ''}
    ${formData.progression ? `- Progression: ${formData.progression}` : ''}
    ${formData.character ? `- Character: ${formData.character}` : ''}
    ${formData.severity ? `- Severity: ${formData.severity}` : ''}
    ${formData.location ? `- Location: ${formData.location}` : ''}
    ${formData.radiation ? `- Radiation: ${formData.radiation}` : ''}
    ${formData.associatedSymptoms ? `- Associated Symptoms: ${formData.associatedSymptoms}` : ''}
    ${formData.negativeFindings ? `- Pertinent Negatives: ${formData.negativeFindings}` : ''}
    ${formData.aggravating ? `- Aggravating Factors: ${formData.aggravating}` : ''}
    ${formData.relieving ? `- Relieving Factors: ${formData.relieving}` : ''}
    ${formData.prevTreatment ? `- Previous Medical Interventions: ${formData.prevTreatment}` : ''}
    ${formData.respTreatment ? `- Response to Previous Treatments: ${formData.respTreatment}` : ''}
    ${formData.impact ? `- Functional Impact: ${formData.impact}` : ''}
  `.trim();

  const obgynDetailsCombined = `
    - Gravida: ${formData.gravida || 'Not specified'}
    - Parity: ${formData.parity || 'Not specified'}
    - Current Pregnancy Details: ${formData.currentPregnancyDetails || 'Not specified'}
    - Past Obstetric History: ${formData.obstetricHistory || 'Not specified'}
    - Gynaecological History: ${formData.gynaecologicalHistory || 'Not specified'}
  `.trim();

  const pediatricDetailsCombined = `
    - Antenatal & Prenatal History: ${formData.antenatalHistory || 'Not specified'}
    - Natal & Delivery History: ${formData.natalHistory || 'Not specified'}
    - Nutritional & Weaning History: ${formData.nutritionalHistory || 'Not specified'}
    - Immunization Status & History: ${formData.immunizationHistory || 'Not specified'}
    - Development & Milestones History: ${formData.developmentalHistory || 'Not specified'}
  `.trim();

  return `
    You are an elite Senior Clinical Consultant and a medical educator at a leading Commonwealth teaching hospital (such as Mengo Hospital or Mulago Hospital).
    Your task is to synthesize an exceptionally high-quality, comprehensive, and detailed academic clinical case write-up based on the raw records provided.
    
    CRITICAL TONE & ANTI-AI PHRASING MANDATES:
    - Write in a highly objective, concise, and dense academic medical clinician tone.
    - Avoid ALL generic AI intro/outro filler phrasing, transitioning remarks, or repetitive summary blocks.
    - DO NOT use unscientific or "AI-slop" words such as: "multifaceted", "interplay", "synergy", "testament", "tapestry", "delve", "pinnacle", "vital", "crucial", "holistic", "importance", "key", "notably", "furthermore", "essential", "dynamic", "comprehensively", "understand the significance", "it is highly important to note".
    - Adopt realistic clinical shorthands where appropriate (e.g. "G3P2 SVD term", "NAD", "PR 80 bpm", "SpO2 98% on RA").
    - Do NOT structure sections with generic narrative fluff. Start sentences directly with clinical observations (e.g. "A 2-year old male presented with..." instead of "This interesting clinical case highlights the story of a 2-year-old...").

    PATIENT DEMOGRAPHICS:
    - Name/Initials: ${patientName}
    - Age: ${patientAge}
    - Sex: ${patientSex}
    - Specialty: ${specialty}
    - Ward/Bed space: ${formData.ward || 'General ward'} / ${formData.bed || 'No bed assignment'}
    - Registration No: ${formData.registrationNo || 'Not documented'}

    RAW PRESENTING COMPLAINT & CLINICAL NOTES:
    - Chief Complaint: ${formData.chiefComplaint || 'Not specified'} (Duration: ${formData.duration || 'Not specified'})
    - History of Presenting Complaint (HPC): ${hpcDetailsCombined}
    - Review of Systems (ROS): ${formData.reviewOfSystems || 'No specific ROS details recorded.'}
    - Past Medical History (PMH): ${formData.pastMedicalHistory || 'No PMH details recorded.'}
    - Chronic conditions/Medications/Allergies: ${formData.medications || 'None'} / ${formData.allergies || 'None'}
    - Past Surgical History (PSH): ${formData.pastSurgicalHistory || 'No PSH details recorded.'}
    - Family & Social History (FSH): ${fshDetailsCombined}
    - Physical Examination Findings: ${physicalDetailsCombined}
    - Obstetrics & Gynaecology History Details: ${obgynDetailsCombined}
    - Pediatrics Developmental & Birth History Details: ${pediatricDetailsCombined}

    DETAILED RESPONSE SECTION INSTRUCTIONS:
    1. hpcNarrative: Draft a rigorous, chronological narrative of the history of presenting complaint (HPC). Specify onset, progression, character, aggravating/alleviating factors, and pertinent negatives with elite clinical precision.
    2. rosNarrative: Synthesize a thorough Review of Systems (ROS). Group findings systematically by clinical systems.
    
    3. SPECIALTY-SPECIFIC NARRATIVE MANIFEST:
       - If Specialty is 'Obstetrics & Gynecology':
         * Set "pediatricNarrative" to null.
         * Populate "obGynNarrative" with deep details: Gravida, Parity, LMP, EDD, complications, antenatal visits, menses cycle, flows, contraception, and screening histories.
       - If Specialty is 'Pediatrics':
         * Set "obGynNarrative" to null.
         * Populate "pediatricNarrative" with exhaustive details: Antenatal (maternal health, infections, ANC profile), Natal (delivery mode, birth weight, APGAR, resuscitation), Neonatal course, Nutritional history (weaning, feeding types), Immunization status (Uganda National Expanded Programme on Immunisation - UNEPI schedule compliance), and Growth/Developmental milestones.
       - If Specialty is 'Surgery' or 'Internal Medicine':
         * Set BOTH "obGynNarrative" and "pediatricNarrative" to null.

    4. pmhNarrative: Summarize Past Medical History (PMH) including comorbidities, previous hospitalizations, and long-term pharmacotherapy.
    5. pshNarrative: Detail Past Surgical History (PSH) indicating prior procedures, indications, dates, and post-operative courses.
    6. fshNarrative: Detail Family & Social History (FSH) outlining environmental exposure, sanitation, water access, and hereditary predispositions.
    7. examinationNarrative: Provide a structured write-up of physical examination findings, reporting systemic clinical signs, vitals, and specific system maneuvers.
    8. differentials: Detail 3 to 5 differential diagnoses. For EACH, provide concrete pathophysiology justifications showing why it is ruled in and how it differs from other differentials.
    9. impression: State the consolidated working clinical impression/diagnosis.
    10. plan: Provide a 5-10 point complete diagnostic, therapeutic, and emergency safety netting plan.
    11. priorityInvestigations: Supply a specific 4-7 point list of focused lab tests (e.g. CBC, blood culture, LFTs, CRP, specific imaging) matching standard clinical protocols for this case and specialty.
    12. managementSuggestions: Provide a specific 4-7 point list of therapeutic suggestions (e.g. specific drug dosages, supportive procedures, dietary guidelines) matching the regional context (Uganda/low-resource context where Mengo Hospital is located).
    13. wardRoundPresentation: Draft the formal morning ward round script (2-3 paragraphs of high density text, outlining summary of presentation, exam findings, assessment, and direct active question).
    14. caseDiscussionSections: Create an exhaustive, textbook-grade academic case discussion containing 3 distinct sections (each with a Title and Content). Discuss deep Pathophysiology, contemporary clinical guidelines (e.g., Westley Croup Score, GINA, WHO, or relevant guidelines), regional/tropical medicine nuances, and textbook vs. patient presentation contrast.
    15. references: Include 3-5 high-impact academic journal references in Vancouver format.

    Return the response in STRICT JSON format with the following keys:
    hpcNarrative, rosNarrative, obGynNarrative, pediatricNarrative, pmhNarrative, pshNarrative, fshNarrative, examinationNarrative, investigationsNarrative, procedureNarrative, differentials (array of objects with diagnosis and reasoning), impression, plan (array of strings), priorityInvestigations (array of strings), managementSuggestions (array of strings), wardRoundPresentation, caseDiscussionSections (array of objects with title and content), references (array of strings).
  `;
};

const getInitials = (name: string) => {
  if (!name) return 'N/A';
  return name.split(' ').map(n => n[0]).join('.').toUpperCase();
};

const MedicalReportPDF = ({ formData, steps }: { formData: any, steps: Step[] }) => (
  <Document>
    {steps.map((step, index) => (
      <Page key={step.id} size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <View>
            <Text style={pdfStyles.brand}>Malae Medical Workspace</Text>
            <Text style={pdfStyles.reportType}>Case Details Report</Text>
          </View>
          <View style={pdfStyles.meta}>
            <Text style={pdfStyles.date}>{new Date().toLocaleDateString()}</Text>
            <Text style={pdfStyles.stepLabel}>{step.label}</Text>
          </View>
        </View>

        <View style={pdfStyles.titleSection}>
          <Text style={pdfStyles.title}>{step.title}</Text>
          <Text style={pdfStyles.subtitle}>{step.subtitle}</Text>
        </View>

        <View style={pdfStyles.content}>
          {step.id === 'specialty' && (
            <View style={pdfStyles.fullWidth}>
              <Text style={pdfStyles.fieldLabel}>Clinical Specialty</Text>
              <Text style={pdfStyles.fieldValue}>{formData.specialty || 'Internal Medicine'}</Text>
            </View>
          )}

          {step.id === 'input_history' && (
            <View>
              <View style={pdfStyles.grid}>
                {[
                  { label: 'Patient Initials', value: getInitials(formData.fullName) },
                  { label: 'Age (years)', value: formData.age },
                  { label: 'Sex', value: formData.sex },
                  { label: 'Address/Location', value: formData.address || 'Kampala' },
                  { label: 'Date of Admission', value: formData.admissionDate || new Date().toISOString().split('T')[0] },
                ].map((field, i) => (
                  <View key={i} style={pdfStyles.gridItem}>
                    <Text style={pdfStyles.fieldLabel}>{field.label}</Text>
                    <Text style={pdfStyles.fieldValue}>{field.value || 'N/A'}</Text>
                  </View>
                ))}
              </View>
              
              <View style={[pdfStyles.fullWidth, { marginTop: 20 }]}>
                <Text style={pdfStyles.fieldLabel}>Clinical Presentation & History</Text>
                <Text style={pdfStyles.fieldValue}>{formData.historyInput || 'No history recorded yet.'}</Text>
              </View>
            </View>
          )}

          {step.id === 'physical_exam' && (
            <View style={pdfStyles.fullWidth}>
              <Text style={pdfStyles.fieldLabel}>Physical Examination Findings</Text>
              <Text style={pdfStyles.fieldValue}>{formData.physicalExam || 'Examination skipped or no findings recorded.'}</Text>
            </View>
          )}

          {step.id === 'compiled_report' && (
            <View style={pdfStyles.fullWidth}>
              <Text style={pdfStyles.fieldLabel}>Synthesized Case Story</Text>
              <Text style={pdfStyles.fieldValue}>{formData.storyData?.summary || 'No compiled story available yet.'}</Text>
            </View>
          )}

          {step.id === 'ai_suggestions' && (
            <View style={pdfStyles.grid}>
              <View style={pdfStyles.fullWidth}>
                <Text style={pdfStyles.fieldLabel}>Differential Diagnoses</Text>
                <Text style={pdfStyles.fieldValue}>
                  {formData.storyData?.differentials 
                    ? formData.storyData.differentials.map((d: any, idx: number) => `${idx + 1}. ${d.diagnosis}: ${d.reasoning}`).join('\n\n')
                    : 'No differential diagnoses generated yet.'}
                </Text>
              </View>
              <View style={[pdfStyles.fullWidth, { marginTop: 15 }]}>
                <Text style={pdfStyles.fieldLabel}>Priority Investigations Plan</Text>
                <Text style={pdfStyles.fieldValue}>
                  {formData.storyData?.plan 
                    ? formData.storyData.plan.map((p: string, idx: number) => `${idx + 1}. ${p}`).join('\n')
                    : 'No medical investigation plans generated yet.'}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>Confidential Medical Record</Text>
          <Text style={pdfStyles.footerText}>Page {index + 1} of {steps.length}</Text>
        </View>
      </Page>
    ))}
  </Document>
);

const ClinicalCaseStoryPDF = ({ formData, storyData, title }: { formData: any, storyData: any, title?: string }) => (
  <Document>
    {/* Page 1: Cover Page */}
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.coverPage}>
        <Text style={{ fontSize: 13, color: '#475569', fontWeight: 'bold', marginBottom: 5, letterSpacing: 2, textTransform: 'uppercase' }}>UCU SCHOOL OF MEDICINE / MENGO HOSPITAL</Text>
        <Text style={{ fontSize: 9, color: '#94A3B8', marginBottom: 25, letterSpacing: 1, textTransform: 'uppercase' }}>Academic Clinical Case Workspace</Text>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1E293B' }}>{getInitials(formData.fullName)}</Text>
        <Text style={{ fontSize: 11, color: '#D4A5A5', marginBottom: 35, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 'bold' }}>{formData.specialty || 'General Clinical'} Case Write-Up</Text>
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 40, color: '#0F172A', letterSpacing: 1 }}>CLINICAL CASE WRITE-UP</Text>
        <Text style={{ fontSize: 14, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 40, color: '#1E293B', lineHeight: 1.4 }}>
          TOPIC: {title?.toUpperCase() || storyData.impression?.toUpperCase() || formData.chiefComplaint?.toUpperCase() || 'CLINICAL CASE'}
        </Text>
      </View>
      <View style={pdfStyles.footer}>
        <Text style={pdfStyles.footerText}>Malae Medical Workspace - Confidential Academic Report</Text>
        <Text style={pdfStyles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </Page>

    {/* Page 2: Demographics & History */}
    <Page size="A4" style={pdfStyles.page} wrap>
      <View style={{ marginBottom: 15, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
        <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 6, color: '#1E293B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Clinical Demographics Matrix</Text>
        <View style={{ flexWrap: 'wrap', flexDirection: 'row' }}>
          {[
            { label: 'Institution', value: 'UCU School of Medicine / Mengo Hospital' },
            { label: 'Attending Clinician', value: 'Samantha Ainembabazi, MBChB Candidate' },
            { label: 'Registration No', value: formData.registrationNo },
            { label: 'Ward / Bedspace', value: formData.ward ? `${formData.ward}${formData.bed ? ` / ${formData.bed}` : ''}` : formData.bed },
            { label: 'Date of Admission', value: formData.admissionDate },
            { label: 'Date of Discharge', value: formData.dischargeDate || 'Ongoing / Pending' },
            { label: 'Patient Name/Initials', value: getInitials(formData.fullName) },
            { label: 'Age / Sex', value: `${formData.age ? `${formData.age} yrs` : 'N/A'} / ${formData.sex || 'N/A'}` },
            { label: 'Tribe (Ethnicity)', value: formData.ethnicity },
            { label: 'Residential Address', value: formData.address },
            { label: 'Religion / Occ.', value: `${formData.religion || 'N/A'} / ${formData.occupation || 'N/A'}` },
            { label: 'Next of Kin', value: formData.nextOfKin ? `${formData.nextOfKin}${formData.relationship ? ` (${formData.relationship})` : ''}` : 'N/A' },
          ].map((field, i) => (
            <View key={i} style={{ width: '50%', marginBottom: 4 }}>
              <Text style={{ fontSize: 8 }}>
                <Text style={{ fontWeight: 'bold', color: '#334155' }}>{field.label}: </Text>
                <Text style={{ color: '#64748B' }}>{field.value || 'N/A'}</Text>
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: '#1E293B' }}>Presenting Complaint;</Text>
      <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}>
        <Text style={{ fontSize: 10, marginRight: 5, color: '#1E293B' }}>✓</Text>
        <Text style={{ fontSize: 9, color: '#334155', fontWeight: 'bold' }}>{formData.chiefComplaint} x {formData.duration}</Text>
      </View>

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 5, color: '#1E293B' }}>History of Presenting Complaint</Text>
      <Text style={pdfStyles.paragraph}>{storyData.hpcNarrative}</Text>

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: '#1E293B' }}>Review of Other Systems</Text>
      <Text style={pdfStyles.paragraph}>{storyData.rosNarrative}</Text>

      {storyData.obGynNarrative ? (
        <>
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: '#1E293B' }}>Obstetrics & Gynaecology History</Text>
          <Text style={pdfStyles.paragraph}>{storyData.obGynNarrative}</Text>
        </>
      ) : null}

      {storyData.pediatricNarrative ? (
        <>
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: '#1E293B' }}>Antenatal, Natal, Developmental & Immunization History (Pediatrics)</Text>
          <Text style={pdfStyles.paragraph}>{storyData.pediatricNarrative}</Text>
        </>
      ) : null}

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: '#1E293B' }}>Past Medical History</Text>
      <Text style={pdfStyles.paragraph}>{storyData.pmhNarrative}</Text>

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: '#1E293B' }}>Past Surgical History</Text>
      <Text style={pdfStyles.paragraph}>{storyData.pshNarrative}</Text>

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: '#1E293B' }}>Family & Social History</Text>
      <Text style={pdfStyles.paragraph}>{storyData.fshNarrative}</Text>

      <View style={pdfStyles.footer}>
        <Text style={pdfStyles.footerText}>UCU / Mengo Hospital - Confidential Academic Report</Text>
        <Text style={pdfStyles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </Page>

    {/* Page 3: Differentials & Examination */}
    <Page size="A4" style={pdfStyles.page} wrap>
      <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 8, color: '#1E293B' }}>Differential Diagnoses</Text>
      {storyData.differentials?.map((diff: any, i: number) => (
        <View key={i} style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 9, lineHeight: 1.4, color: '#334155' }}>
            <Text style={{ fontWeight: 'bold', color: '#1E293B' }}>{i + 1}. {diff.diagnosis}:</Text> {diff.reasoning}
          </Text>
        </View>
      ))}

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 15, marginBottom: 8, color: '#1E293B' }}>On Examination</Text>
      <Text style={pdfStyles.paragraph}>{storyData.examinationNarrative}</Text>

      {storyData.investigationsNarrative ? (
        <>
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 12, marginBottom: 5, color: '#1E293B' }}>Investigations Summary;</Text>
          <Text style={pdfStyles.paragraph}>{storyData.investigationsNarrative}</Text>
        </>
      ) : null}

      {storyData.procedureNarrative ? (
        <>
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 12, marginBottom: 5, color: '#1E293B' }}>Procedure & Progress Notes;</Text>
          <Text style={pdfStyles.paragraph}>{storyData.procedureNarrative}</Text>
        </>
      ) : null}

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 12, marginBottom: 5, color: '#1E293B' }}>Clinical Impression;</Text>
      <Text style={pdfStyles.paragraph}>{storyData.impression}</Text>

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 12, marginBottom: 5, color: '#1E293B' }}>Clinical Management & Therapeutic Plan</Text>
      {storyData.plan?.map((item: string, i: number) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: 10 }}>
          <Text style={{ fontSize: 9, width: 15, color: '#1E293B', fontWeight: 'bold' }}>{i + 1}.</Text>
          <Text style={{ fontSize: 9, flex: 1, color: '#334155' }}>{item}</Text>
        </View>
      ))}

      <View style={pdfStyles.footer}>
        <Text style={pdfStyles.footerText}>UCU / Mengo Hospital - Confidential Academic Report</Text>
        <Text style={pdfStyles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </Page>

    {/* Page 4: Case Discussion */}
    <Page size="A4" style={pdfStyles.page} wrap>
      <Text style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: '#1E293B', letterSpacing: 0.5 }}>SCHOLARLY CASE DISCUSSION</Text>
      
      {storyData.caseDiscussionSections?.map((section: any, i: number) => (
        <View key={i} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 4, color: '#1E293B' }}>{section.title}</Text>
          <Text style={pdfStyles.paragraph}>{section.content}</Text>
        </View>
      )) || <Text style={pdfStyles.paragraph}>{storyData.caseDiscussion}</Text>}

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 15, marginBottom: 8, color: '#1E293B' }}>References (Vancouver Format)</Text>
      {storyData.references?.map((ref: string, i: number) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 4 }}>
          <Text style={{ fontSize: 8, width: 15, color: '#64748B' }}>{i + 1}.</Text>
          <Text style={{ fontSize: 8, flex: 1, color: '#475569' }}>{ref}</Text>
        </View>
      ))}

      <View style={pdfStyles.footer}>
        <Text style={pdfStyles.footerText}>UCU / Mengo Hospital - Confidential Academic Report</Text>
        <Text style={pdfStyles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </Page>
  </Document>
);

// --- Main App ---

// --- Helpers ---

const getApiBaseUrl = () => {
  if (Capacitor.isNativePlatform()) {
    const savedUrl = localStorage.getItem('malae_api_url');
    if (savedUrl) return savedUrl;
    return 'https://ais-pre-uyd6ehinkvjd3dd3ytwd53-33678728397.europe-west1.run.app';
  }
  return '';
};

const callGemini = async (contents: any[], config: any = {}, model: string = "gemini-3.5-flash") => {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/gemini`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, contents, config })
  });
  
  const responseData = await response.json().catch(() => ({ error: "Failed to parse JSON response from backend server" }));
  if (!response.ok) {
    throw new Error(responseData.error || `AI backend responded with status: ${response.status}`);
  }
  
  if (responseData.error) {
    throw new Error(responseData.error);
  }
  
  return responseData;
};

const cleanMimeType = (type: string) => {
  if (!type) return 'audio/webm';
  let clean = type.split(';')[0].trim().toLowerCase();
  
  if (clean === 'audio/x-m4a') return 'audio/m4a';
  if (clean === 'audio/x-wav') return 'audio/wav';
  if (clean === 'audio/x-mp3') return 'audio/mp3';
  if (clean === 'audio/x-webm') return 'audio/webm';
  if (clean === 'audio/3gp') return 'audio/3gpp';
  if (clean === 'audio/aac') return 'audio/aac';
  
  return clean || 'audio/webm';
};

const cleanAndParseJSON = (text: string) => {
  if (!text) throw new Error("Empty JSON text");
  let cleaned = text.trim();
  
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
    cleaned = cleaned.trim();
  }
  
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  } else {
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.slice(firstBracket, lastBracket + 1);
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("First JSON parse attempt failed, trying to sanitize trailing commas...", err);
    try {
      const sanitized = cleaned.replace(/,\s*([\}\]])/g, '$1');
      return JSON.parse(sanitized);
    } catch (secondErr) {
      console.error("Both JSON parse attempts failed on:", cleaned);
      throw secondErr;
    }
  }
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'generator' | 'viewer' | 'profile'>('dashboard');
  const [generatorMode, setGeneratorMode] = useState<'selection' | 'form' | 'upload' | 'audio'>('selection');
  const [historyTab, setHistoryTab] = useState<'voice' | 'direct' | 'doc'>('voice');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [directSection, setDirectSection] = useState<'demographics' | 'complaint' | 'hpc' | 'ped_prenatal' | 'ped_dev_immune' | 'ped_nutrition' | 'obg_current_obstetric' | 'obg_past_obstetric' | 'obg_gynae' | 'review' | 'medical' | 'surgical' | 'family_social' | 'physical_exam'>('demographics');

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<any>(() => {
    const saved = localStorage.getItem('malae_form_data');
    return saved ? JSON.parse(saved) : {
      admissionDate: new Date().toISOString().split('T')[0],
      specialty: 'Internal Medicine',
      address: 'Kampala',
    };
  });

  const activeSteps = useMemo(() => {
    return STEPS;
  }, []);

  useEffect(() => {
    localStorage.setItem('malae_form_data', JSON.stringify(formData));
  }, [formData]);
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());
  const [reports, setReports] = useState<Report[]>([]);
  const [collaboratorReports, setCollaboratorReports] = useState<Report[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [syncedStoryData, setSyncedStoryData] = useState<any>(null);
  const [customSuggestionText, setCustomSuggestionText] = useState("");

  const handleToggleSuggestionInPlan = (suggestion: string) => {
    if (!syncedStoryData) return;
    const currentPlan = syncedStoryData.plan || [];
    const isSelected = currentPlan.some((p: string) => p.trim().toLowerCase() === suggestion.trim().toLowerCase());
    const newPlan = isSelected 
      ? currentPlan.filter((p: string) => p.trim().toLowerCase() !== suggestion.trim().toLowerCase())
      : [...currentPlan, suggestion];
    
    setSyncedStoryData({
      ...syncedStoryData,
      plan: newPlan
    });
  };

  const handleAddCustomSuggestion = () => {
    if (!customSuggestionText.trim() || !syncedStoryData) return;
    const cleanText = customSuggestionText.trim();
    const newSuggestions = [...(syncedStoryData.managementSuggestions || []), cleanText];
    const newPlan = [...(syncedStoryData.plan || []), cleanText];
    setSyncedStoryData({
      ...syncedStoryData,
      managementSuggestions: newSuggestions,
      plan: newPlan
    });
    setCustomSuggestionText("");
  };

  const handleUpdateSuggestionText = (index: number, newText: string) => {
    if (!syncedStoryData) return;
    const originalSug = (syncedStoryData.managementSuggestions || [])[index];
    const newSuggestions = [...(syncedStoryData.managementSuggestions || [])];
    newSuggestions[index] = newText;
    
    // Also update in plan if present
    let newPlan = [...(syncedStoryData.plan || [])];
    const planIndex = newPlan.findIndex((p: string) => p.trim().toLowerCase() === originalSug.trim().toLowerCase());
    if (planIndex !== -1) {
      newPlan[planIndex] = newText;
    }
    
    setSyncedStoryData({
      ...syncedStoryData,
      managementSuggestions: newSuggestions,
      plan: newPlan
    });
  };

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [showSkipExamModal, setShowSkipExamModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingField, setRecordingField] = useState<string | null>(null);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(120);
  const [transcribingField, setTranscribingField] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });
  const [originalReportStatus, setOriginalReportStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');
  const [storyReportStatus, setStoryReportStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');

  const isGenerating = originalReportStatus === 'generating' || storyReportStatus === 'generating';
  const [isSaving, setIsSaving] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function testConnection() {
      const path = 'test/connection';
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });

    let reportsUnsubscribe: (() => void) | undefined;
    let collabUnsubscribe: (() => void) | undefined;

    if (user) {
      const q = query(
        collection(db, 'reports'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      reportsUnsubscribe = onSnapshot(q, (snapshot) => {
        const reportsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Report[];
        setReports(reportsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reports');
      });

      if (user.email) {
        const qCollab = query(
          collection(db, 'reports'),
          where('collaborators', 'array-contains', user.email),
          orderBy('createdAt', 'desc')
        );

        collabUnsubscribe = onSnapshot(qCollab, (snapshot) => {
          const reportsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Report[];
          setCollaboratorReports(reportsData);
        }, (error) => {
          // Silently handle or log
          console.error("Collab fetch error:", error);
        });
      }
    } else {
      setReports([]);
      setCollaboratorReports([]);
    }

    const savedData = localStorage.getItem('malae_form_data');
    if (savedData) {
      try {
        setFormData(JSON.parse(savedData));
      } catch (e) {
        console.error("Error loading autosave data:", e);
      }
    }

    return () => {
      unsubscribe();
      if (reportsUnsubscribe) reportsUnsubscribe();
      if (collabUnsubscribe) collabUnsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    
    const params = new URLSearchParams(window.location.search);
    const urlReportId = params.get('reportId');
    if (urlReportId) {
      const docRef = doc(db, 'reports', urlReportId);
      getDocFromServer(docRef).then(async (snap) => {
        if (snap.exists()) {
          const reportData = { id: snap.id, ...snap.data() } as any;
          setSelectedReport(reportData);
          setFormData(reportData.patientData || {});
          setSyncedStoryData(reportData.reportData || null);
          setView('viewer');
          
          window.history.replaceState({}, document.title, window.location.pathname);
          
          if (user && user.email) {
            const colls = reportData.collaborators || [];
            if (reportData.userId !== user.uid && !colls.includes(user.email)) {
              try {
                await updateDoc(docRef, {
                  collaborators: [...colls, user.email]
                });
                console.log("Successfully added user as collaborator to clinical case:", urlReportId);
              } catch (e) {
                console.error("Auto-add collaborator failed:", e);
              }
            }
          }
        } else {
          alert("The shared clinical case could not be located on the server.");
        }
      }).catch((err) => {
        console.error("Error fetching shared report:", err);
      });
    }
  }, [user, authLoading]);

  const allReports = useMemo(() => {
    const combined = [...reports, ...collaboratorReports];
    // Remove duplicates by ID
    const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    return unique.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB - dateA;
    });
  }, [reports, collaboratorReports]);

  // Auto-save logic
  useEffect(() => {
    if (!user || Object.keys(formData).length === 0 || isGenerating) return;

    const timeoutId = setTimeout(async () => {
      if (selectedReport?.id) {
        try {
          await updateDoc(doc(db, 'reports', selectedReport.id), {
            patientData: formData,
            updatedAt: serverTimestamp()
          });
          console.log("Auto-saved existing report");
        } catch (error) {
          console.error("Auto-save error:", error);
        }
      }
      // For new cases, we could save as a draft, but the user might not want a new doc every time.
      // We'll stick to localStorage for new cases until they are explicitly saved/generated.
      localStorage.setItem('malae_form_data', JSON.stringify(formData));
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [formData, user, selectedReport, isGenerating]);

  const handleInviteCollaborator = async (reportId: string, email: string) => {
    if (!email) return;
    try {
      const reportRef = doc(db, 'reports', reportId);
      const reportSnap = await getDocFromServer(reportRef);
      if (reportSnap.exists()) {
        const data = reportSnap.data();
        const currentCollabs = data.collaborators || [];
        if (!currentCollabs.includes(email)) {
          await updateDoc(reportRef, {
            collaborators: [...currentCollabs, email]
          });
          alert(`Invited ${email} to collaborate!`);
        } else {
          alert(`${email} is already a collaborator.`);
        }
      }
    } catch (error) {
      console.error("Invite error:", error);
      alert("Failed to invite collaborator.");
    }
  };
  const startVoiceInput = async (field: string) => {
    if (isRecording && recordingField === field) {
      stopVoiceInput();
      return;
    }
    
    if (isRecording) {
      stopVoiceInput();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const recordedMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedMimeType });
        await transcribeAudio(audioBlob, field);
        setRecordingField(null);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingField(field);
      setRecordingTimeLeft(120);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTimeLeft((prev) => {
          if (prev <= 1) {
            stopVoiceInput();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopVoiceInput = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingField(null);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const transcribeAudio = async (blob: Blob, field: string) => {
    setGenerationStatus("Transcribing clinical audio...");
    setTranscribingField(field);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          const cleanType = cleanMimeType(blob.type);
          const response = await callGemini([{
            parts: [
              { text: "Transcribe this clinical audio accurately. Return only the transcription text. If the audio is silent or unintelligible, return an empty string." },
              { inlineData: { data: base64Audio, mimeType: cleanType } }
            ]
          }]);

          const transcription = response.text;
          if (transcription && transcription.trim()) {
            updateField(field, (prev: string) => {
              const current = prev || '';
              return current ? `${current} ${transcription.trim()}` : transcription.trim();
            });
          }
        } catch (err) {
          console.error("Transcription error:", err);
        } finally {
          setTranscribingField(null);
          setGenerationStatus("");
        }
      };
    } catch (err) {
      console.error("FileReader error:", err);
      setTranscribingField(null);
      setGenerationStatus("");
    }
  };

  const handleFileProcessing = async (file: File) => {
    setIsProcessingFile(true);
    setGenerationStatus("Extracting clinical data from file...");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const mimeType = file.type;
        
        const prompt = `
          Extract clinical data from this ${file.type.includes('pdf') ? 'PDF document' : 'medical image'} and map it to the following JSON structure. 
          The case is in the specialty of ${formData.specialty || 'General Medicine'}.
          Be extremely thorough and precise. Extract every piece of clinical information available.
          
          Structure:
          {
            "admissionDate": "YYYY-MM-DD",
            "fullName": "...",
            "age": "...",
            "sex": "...",
            "occupation": "...",
            "address": "...",
            "chiefComplaint": "...",
            "duration": "...",
            "onset": "...",
            "progression": "...",
            "associatedSymptoms": "...",
            "negativeFindings": "...",
            "chronicConditions": "...",
            "medications": "...",
            "allergies": "...",
            "vitals": "...",
            "physicalExam": "...",
            "investigations": "...",
            "managementPlan": "..."
          }
        `;

        const response = await callGemini(
          [{
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType } }
            ]
          }],
          { responseMimeType: "application/json" }
        );

        const extractedData = cleanAndParseJSON(response.text);
        
        let combinedHistory = '';
        if (extractedData.chiefComplaint) {
          combinedHistory += `CHIEF COMPLAINT:\n${extractedData.chiefComplaint} (Duration: ${extractedData.duration || 'N/A'})\n\n`;
        }
        if (extractedData.onset || extractedData.progression) {
          combinedHistory += `HPI CHARACTERISTICS:\n- Onset: ${extractedData.onset || 'N/A'}\n- Progression: ${extractedData.progression || 'N/A'}\n`;
        }
        if (extractedData.associatedSymptoms) {
          combinedHistory += `- Associated symptoms: ${extractedData.associatedSymptoms}\n`;
        }
        if (extractedData.chronicConditions || extractedData.medications) {
          combinedHistory += `\nPAST MEDICAL BACKGROUND:\n- Conditions: ${extractedData.chronicConditions || 'None documented'}\n- Medications: ${extractedData.medications || 'None documented'}\n`;
        }
        if (extractedData.allergies) {
          combinedHistory += `- Allergies: ${extractedData.allergies}\n`;
        }

        setFormData((prev: any) => {
          const mainHistory = prev.historyInput || '';
          const newlyCombined = combinedHistory.trim();
          const updatedHistory = mainHistory ? `${mainHistory}\n\n=== FILE EXTRACTION ===\n${newlyCombined}` : newlyCombined;
          
          return {
            ...prev,
            ...extractedData,
            historyInput: updatedHistory,
            physicalExam: extractedData.physicalExam || extractedData.vitals || prev.physicalExam || ''
          };
        });
        setIsProcessingFile(false);
      };
    } catch (err) {
      console.error("File processing error:", err);
      setIsProcessingFile(false);
    }
  };

  const handleFullCaseFileProcessing = async (file: File) => {
    setIsProcessingFile(true);
    setGenerationStatus("Extracting full clinical data from file...");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const mimeType = file.type;
        
        const prompt = `
          Extract all clinical data from this ${file.type.includes('pdf') ? 'PDF' : 'image'} and map it to the following JSON structure. 
          If a field is not found, leave it blank.
          
          Structure:
          {
            "admissionDate": "...",
            "fullName": "...",
            "age": "...",
            "sex": "...",
            "ethnicity": "...",
            "address": "...",
            "religion": "...",
            "occupation": "...",
            "nextOfKin": "...",
            "relationship": "...",
            "chiefComplaint": "...",
            "duration": "...",
            "onset": "...",
            "progression": "...",
            "character": "...",
            "severity": "...",
            "location": "...",
            "radiation": "...",
            "associatedSymptoms": "...",
            "negativeFindings": "...",
            "aggravating": "...",
            "relieving": "...",
            "prevTreatment": "...",
            "respTreatment": "...",
            "impact": "...",
            "GENERAL_present": "...",
            "GENERAL_denied": "...",
            "CARDIOVASCULAR_present": "...",
            "CARDIOVASCULAR_denied": "...",
            "RESPIRATORY_present": "...",
            "RESPIRATORY_denied": "...",
            "GASTROINTESTINAL_present": "...",
            "GASTROINTESTINAL_denied": "...",
            "chronicConditions": "...",
            "medications": "...",
            "allergies": "...",
            "surgeries": "...",
            "trauma": "...",
            "transfusions": "...",
            "familyHistory": "...",
            "alcohol": "...",
            "tobacco": "...",
            "maritalStatus": "...",
            "dependents": "..."
          }
        `;

        const response = await callGemini(
          [{
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType } }
            ]
          }],
          { responseMimeType: "application/json" }
        );

        const extractedData = cleanAndParseJSON(response.text);
        setFormData((prev: any) => ({ ...prev, ...extractedData }));
        setGeneratorMode('form');
        setIsProcessingFile(false);
      };
    } catch (err) {
      console.error("File processing error:", err);
      setIsProcessingFile(false);
    }
  };

  const handleFullCaseAudioTranscription = async (blob: Blob) => {
    setIsProcessingFile(true);
    setGenerationStatus("Transcribing and extracting clinical data from audio...");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const prompt = `
          Transcribe this clinical case presentation and extract all relevant data into the following JSON structure. 
          Be extremely thorough and professional. If a field is not found, leave it blank.
          
          Structure:
          {
            "admissionDate": "YYYY-MM-DD",
            "fullName": "Patient Initials",
            "age": "Number",
            "sex": "Male/Female",
            "ethnicity": "...",
            "address": "...",
            "religion": "...",
            "occupation": "...",
            "nextOfKin": "...",
            "relationship": "...",
            "chiefComplaint": "...",
            "duration": "...",
            "onset": "...",
            "progression": "...",
            "character": "...",
            "severity": "...",
            "location": "...",
            "radiation": "...",
            "associatedSymptoms": "...",
            "negativeFindings": "...",
            "aggravating": "...",
            "relieving": "...",
            "prevTreatment": "...",
            "respTreatment": "...",
            "impact": "...",
            "GENERAL_present": "...",
            "GENERAL_denied": "...",
            "CARDIOVASCULAR_present": "...",
            "CARDIOVASCULAR_denied": "...",
            "RESPIRATORY_present": "...",
            "RESPIRATORY_denied": "...",
            "GASTROINTESTINAL_present": "...",
            "GASTROINTESTINAL_denied": "...",
            "chronicConditions": "...",
            "medications": "...",
            "allergies": "...",
            "surgeries": "...",
            "trauma": "...",
            "transfusions": "...",
            "familyHistory": "...",
            "alcohol": "...",
            "tobacco": "...",
            "maritalStatus": "...",
            "dependents": "..."
          }
        `;

        const cleanType = cleanMimeType(blob.type);
        const response = await callGemini(
          [{
            parts: [
              { text: prompt },
              { inlineData: { data: base64Audio, mimeType: cleanType } }
            ]
          }],
          { responseMimeType: "application/json" }
        );

        let extractedData = {};
        try {
          extractedData = cleanAndParseJSON(response.text);
        } catch (parseErr) {
          console.error("Failed parsing extracted structured audio JSON:", parseErr);
          alert("We were unable to extract structured data from the audio transcription. Please verify the audio file or try detailing the history manually.");
        }
        setFormData((prev: any) => ({ ...prev, ...extractedData }));
        setGeneratorMode('form');
        setIsProcessingFile(false);
      };
    } catch (err) {
      console.error("Audio processing error:", err);
      setIsProcessingFile(false);
    }
  };

  const startFullCaseAudioInput = async () => {
    if (isRecording) {
      stopFullCaseAudioInput();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const recordedMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedMimeType });
        await handleFullCaseAudioTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Allow longer recording for full case (e.g., 2 minutes)
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          stopFullCaseAudioInput();
        }
      }, 120000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopFullCaseAudioInput = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const generatePPT = async (formData: any, storyData: any) => {
    const pres = new pptxgen();
    
    // Title Slide
    const slide1 = pres.addSlide();
    slide1.addText("Clinical Case Presentation", { x: 1, y: 1, w: 8, h: 1, fontSize: 36, bold: true, color: "363636", align: "center" });
    slide1.addText(storyData.impression || formData.chiefComplaint || "Clinical Case", { x: 1, y: 2, w: 8, h: 1, fontSize: 24, color: "AE6965", align: "center" });
    slide1.addText(`Patient: ${getInitials(formData.fullName)} | Age: ${formData.age} | Sex: ${formData.sex}`, { x: 1, y: 4, w: 8, h: 1, fontSize: 18, color: "666666", align: "center" });
    slide1.addText(`Specialty: ${formData.specialty || 'General'}`, { x: 1, y: 5, w: 8, h: 0.5, fontSize: 14, color: "999999", align: "center" });

    // Demographics
    const slide2 = pres.addSlide();
    slide2.addText("Patient Demographics", { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 24, bold: true, color: "AE6965" });
    slide2.addText([
      { text: `Initials: ${getInitials(formData.fullName)}`, options: { bullet: true } },
      { text: `Age: ${formData.age}`, options: { bullet: true } },
      { text: `Sex: ${formData.sex}`, options: { bullet: true } },
      { text: `Occupation: ${formData.occupation}`, options: { bullet: true } },
      { text: `Address: ${formData.address}`, options: { bullet: true } },
      { text: `Religion: ${formData.religion}`, options: { bullet: true } },
    ], { x: 0.5, y: 1.5, w: 9, h: 3.5, fontSize: 18 });

    // History of Presenting Complaint
    const slide3 = pres.addSlide();
    slide3.addText("History of Presenting Complaint", { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 24, bold: true, color: "AE6965" });
    slide3.addText(storyData.hpcNarrative, { x: 0.5, y: 1.5, w: 9, h: 4, fontSize: 14 });

    // Differentials
    const slide4 = pres.addSlide();
    slide4.addText("Differential Diagnoses", { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 24, bold: true, color: "AE6965" });
    const diffs = storyData.differentials?.map((d: any) => ({ text: `${d.diagnosis}: ${d.reasoning}`, options: { bullet: true } })) || [];
    slide4.addText(diffs, { x: 0.5, y: 1.5, w: 9, h: 4, fontSize: 14 });

    // Impression & Plan
    const slide5 = pres.addSlide();
    slide5.addText("Impression & Management Plan", { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 24, bold: true, color: "AE6965" });
    slide5.addText(`Impression: ${storyData.impression}`, { x: 0.5, y: 1.2, w: 9, h: 1, fontSize: 16, bold: true });
    const planItems = storyData.plan?.map((p: string) => ({ text: p, options: { bullet: true } })) || [];
    slide5.addText(planItems, { x: 0.5, y: 2.5, w: 9, h: 3, fontSize: 14 });

    const blob = await pres.write({ outputType: "blob" }) as Blob;
    triggerDownload(blob, `Clinical_Case_${getInitials(formData.fullName)}`, 'pptx');
  };

  const handleLogout = async () => {
    setShowConfirmModal({
      show: true,
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your clinical session?',
      onConfirm: async () => {
        try {
          await signOut(auth);
          localStorage.removeItem('malae_form_data');
          setView('dashboard');
        } catch (error) {
          console.error("Logout Error:", error);
        }
        setShowConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reports/${id}`);
    }
  };

  const handleSaveReport = async (storyData: any, type: 'original' | 'story' = 'story') => {
    if (!user) return;
    setIsSaving(true);
    try {
      const reportPayload: any = {
        userId: user.uid,
        title: type === 'story' ? (storyData?.impression || formData.chiefComplaint || 'Clinical Case') : (formData.chiefComplaint || 'Clinical Case'),
        diagnosis: type === 'story' ? (storyData?.impression || '') : '',
        type,
        patientData: formData,
        reportData: storyData,
        collaborators: [],
        createdAt: serverTimestamp()
      };

      // Extract hpcNarrative for easier querying if it's a story report
      if (type === 'story' && storyData?.hpcNarrative) {
        reportPayload.hpcNarrative = storyData.hpcNarrative;
      }

      const path = 'reports';
      try {
        await addDoc(collection(db, 'reports'), reportPayload);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
      // Silent save for automatic generations to avoid interrupting flow
      console.log(`${type} report saved successfully`);
    } catch (error) {
      console.error("Error saving report:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const currentStep = activeSteps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / activeSteps.length) * 100;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader />
      </div>
    );
  }

  if (!user) {
    return <Auth onSuccess={() => setView('dashboard')} />;
  }

  const handleCompileReport = async () => {
    setOriginalReportStatus('idle');
    setStoryReportStatus('idle');
    setShowReportModal(true);
  };

  const downloadOriginalReport = async () => {
    setOriginalReportStatus('generating');
    setGenerationStatus("Generating clinical data report...");
    try {
      // Save original report to dashboard
      if (user) {
        await handleSaveReport(null, 'original');
      }
      const blob = await pdf(<MedicalReportPDF formData={formData} steps={activeSteps} />).toBlob();
      triggerDownload(blob, `Clinical_Report_${formData.fullName || 'Patient'}`);
      setOriginalReportStatus('completed');
      setTimeout(() => setOriginalReportStatus('idle'), 3000);
    } catch (error: any) {
      console.error("PDF Generation Error:", error);
      setOriginalReportStatus('error');
    }
  };

  const downloadStoryReport = async () => {
    setStoryReportStatus('generating');
    
    const fallbackData = {
      hpcNarrative: "The clinical narrative could not be generated at this time. Please review the raw data in the original report.",
      rosNarrative: "Review of systems analysis unavailable.",
      obGynNarrative: "",
      pediatricNarrative: "",
      pmhNarrative: "Medical history summary unavailable.",
      pshNarrative: "Surgical history summary unavailable.",
      fshNarrative: "Social history summary unavailable.",
      examinationNarrative: "Physical examination write-up unavailable.",
      investigationsNarrative: "",
      procedureNarrative: "",
      impression: "Clinical impression pending further analysis.",
      plan: ["Review clinical data manually", "Re-attempt report generation", "Consult senior staff"],
      differentials: [
        { diagnosis: "Clinical Correlation Required", reasoning: "The AI was unable to synthesize differential diagnoses from the current dataset." }
      ],
      caseDiscussionSections: [
        { title: "System Notice", content: "The academic case discussion is currently unavailable due to a processing error. This may occur if the clinical data provided is insufficient for deep synthesis." }
      ],
      references: ["Malae Clinical Intelligence System Documentation"],
      priorityInvestigations: ["Complete Blood Count (CBC)", "Diagnostic Imaging"],
      managementSuggestions: ["Supportive Clinical Monitoring"],
      wardRoundPresentation: "Admission briefing pending review."
    };

    if (syncedStoryData) {
      try {
        setGenerationStatus("Compiling story into high-level PDF...");
        const reportTitle = syncedStoryData.impression || formData.chiefComplaint || 'Clinical Case';
        const blob = await pdf(<ClinicalCaseStoryPDF formData={formData} storyData={syncedStoryData} title={reportTitle} />).toBlob();
        const specialtyClean = (formData.specialty || 'Clinical').replace(/[^a-zA-Z0-9]/g, '_');
        triggerDownload(blob, `${specialtyClean}_Case_Write_Up_${formData.fullName || 'Patient'}`);
        setStoryReportStatus('completed');
        setTimeout(() => setStoryReportStatus('idle'), 3000);
        return;
      } catch (err) {
        console.error("PDF compiling from synced story failed, falling back to clean retrieval", err);
      }
    }

    setGenerationStatus("AI is analyzing clinical data and writing case story...");
    try {
      const prompt = getCaseWriteUpPrompt(formData);

      const response = await callGemini(
        [{ parts: [{ text: prompt }] }],
        { 
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      );

      let storyData;
      try {
        const text = response.text;
        if (!text) throw new Error("Empty response from AI");
        storyData = cleanAndParseJSON(text);
        
        // Basic validation of required fields
        const requiredFields = ['hpcNarrative', 'rosNarrative', 'impression', 'plan'];
        const missingFields = requiredFields.filter(f => !storyData[f]);
        if (missingFields.length > 0) {
          console.warn("AI response missing fields:", missingFields);
          storyData = { ...fallbackData, ...storyData };
        }
      } catch (e) {
        console.error("AI Output Parsing Error:", e);
        storyData = fallbackData;
      }
      
      // Save report automatically if user is logged in
      if (user) {
        await handleSaveReport(storyData, 'story');
      }

      setGenerationStatus("Compiling story into high-level PDF...");
      const reportTitle = storyData.impression || formData.chiefComplaint || 'Clinical Case';
      const blob = await pdf(<ClinicalCaseStoryPDF formData={formData} storyData={storyData} title={reportTitle} />).toBlob();
      const specialtyClean = (formData.specialty || 'Clinical').replace(/[^a-zA-Z0-9]/g, '_');
      triggerDownload(blob, `${specialtyClean}_Case_Write_Up_${formData.fullName || 'Patient'}`);
      setStoryReportStatus('completed');
      setTimeout(() => setStoryReportStatus('idle'), 3000);
    } catch (error: any) {
      console.error("Story Generation Error:", error);
      setStoryReportStatus('error');
      
      // Generate PDF with fallback data even on top-level catch
      try {
        const blob = await pdf(<ClinicalCaseStoryPDF formData={formData} storyData={fallbackData} />).toBlob();
        const specialtyClean = (formData.specialty || 'Clinical').replace(/[^a-zA-Z0-9]/g, '_');
        triggerDownload(blob, `${specialtyClean}_Case_Write_Up_${formData.fullName || 'Patient'}_FALLBACK`);
        setStoryReportStatus('completed'); // Fallback is still a success of sorts
        setTimeout(() => setStoryReportStatus('idle'), 3000);
      } catch (pdfError) {
        console.error("Fallback PDF Error:", pdfError);
        setStoryReportStatus('error');
      }
    }
  };

  const triggerDownload = async (blob: Blob, baseName: string, extension: string = 'pdf') => {
    const fileName = `${baseName}_${new Date().getTime()}.${extension}`;
    
    if (Capacitor.isNativePlatform()) {
      try {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          
          // Write to temporary directory
          const result = await Filesystem.writeFile({
            path: fileName,
            data: base64data,
            directory: Directory.Cache
          });

          // Share the file
          await Share.share({
            title: `Share Clinical ${extension.toUpperCase()}`,
            text: 'Malae Tech Clinical Documentation',
            url: result.uri,
            dialogTitle: 'Share or Save Report'
          });
        };
      } catch (error) {
        console.error("Native share error:", error);
        alert("Could not open file externally. Ensure storage permissions are granted.");
      }
      return;
    }

    // Web Fallback
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleNext = () => {
    if (currentStep.id === 'physical_exam' && !formData.physicalExamSkipped && (!formData.physicalExam || !formData.physicalExam.trim())) {
      setShowSkipExamModal(true);
      return;
    }
    if (currentStepIndex < activeSteps.length - 1) {
      setCompletedSteps(prev => new Set(prev).add(currentStep.id));
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setShowConfirmModal({
      show: true,
      title: 'Reset Session',
      message: 'Are you sure you want to reset the session? All current patient data will be lost.',
      onConfirm: () => {
        setFormData({});
        localStorage.removeItem('malae_form_data');
        setCurrentStepIndex(0);
        setCompletedSteps(new Set());
        setGeneratorMode('selection');
        setShowConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const updateField = (field: string, value: any) => {
    if (typeof value === 'function') {
      setFormData((prev: any) => ({ ...prev, [field]: value(prev[field]) }));
    } else {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
    }
  };  const startSpeechSynthesis = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = audioSpeed;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    } else {
      alert("Text-to-speech is not supported in this browser.");
    }
  };

  const stopSpeechSynthesis = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
  };

  const handleAISynthesis = async () => {
    setOriginalReportStatus('generating');
    setGenerationStatus("AI is analyzing clinical data and writing case story...");
    
    try {
      const prompt = getCaseWriteUpPrompt(formData);

      const response = await callGemini(
        [{ parts: [{ text: prompt }] }],
        { 
          responseMimeType: "application/json",
          temperature: 0.3,
        }
      );

      let parsedData;
      try {
        parsedData = cleanAndParseJSON(response.text);
        
        const fallbackFields: any = {
          hpcNarrative: "The clinical narrative could not be generated at this time.",
          rosNarrative: "Review of systems analysis unavailable.",
          pmhNarrative: "Medical history summary unavailable.",
          pshNarrative: "Surgical history summary unavailable.",
          fshNarrative: "Social history summary unavailable.",
          examinationNarrative: "Physical examination write-up unavailable.",
          impression: "Clinical impression pending further analysis.",
          plan: ["Review clinical data manually"],
          differentials: [],
          caseDiscussionSections: [],
          references: [],
          priorityInvestigations: [],
          managementSuggestions: [],
          wardRoundPresentation: ""
        };
        
        parsedData = { ...fallbackFields, ...parsedData };
      } catch (err) {
        console.error("Failed to parse synthesized AI response as JSON, using hard fallback:", err);
        parsedData = {
          hpcNarrative: "The clinical narrative could not be generated at this time. Please review raw data.",
          rosNarrative: "Review of systems analysis unavailable.",
          obGynNarrative: "",
          pediatricNarrative: "",
          pmhNarrative: "Medical history summary unavailable.",
          pshNarrative: "Surgical history summary unavailable.",
          fshNarrative: "Social history summary unavailable.",
          examinationNarrative: "Physical examination write-up unavailable.",
          investigationsNarrative: "",
          procedureNarrative: "",
          impression: "Clinical impression pending further analysis.",
          plan: ["Review clinical data manually", "Re-attempt report generation"],
          differentials: [
            { diagnosis: "Clinical Correlation Required", reasoning: "The AI was unable to synthesize differential diagnoses." }
          ],
          caseDiscussionSections: [
            { title: "System Notice", content: "Academic case discussion is unavailable due to a parsing error." }
          ],
          references: ["Malae Clinical Intelligence System Documentation"],
          priorityInvestigations: ["Complete Blood Count (CBC)"],
          managementSuggestions: ["Supportive Clinical Monitoring"],
          wardRoundPresentation: "Admission briefing pending review."
        };
      }

      setSyncedStoryData(parsedData);
      setOriginalReportStatus('completed');
      setCompletedSteps(prev => {
        const next = new Set(prev);
        next.add('compiled_report');
        return next;
      });
      setTimeout(() => setOriginalReportStatus('idle'), 3000);
      
      if (user) {
        await handleSaveReport(parsedData, 'story');
      }
    } catch (error) {
      console.error("AI Compilation Error:", error);
      alert("AI Compilation failed. Please try again.");
      setOriginalReportStatus('idle');
    }
  };

  const renderStepContent = (stepId: StepId) => {
    switch (stepId) {
      case 'specialty':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {SPECIALTY_MAP.map((spec) => (
              <button
                key={spec.id}
                onClick={() => {
                  setFormData((prev: any) => ({ ...prev, specialty: spec.id }));
                  handleNext();
                }}
                className={`p-5 sm:p-7 rounded-2xl sm:rounded-3xl border-2 transition-all text-left flex flex-col gap-3 sm:gap-4 group relative overflow-hidden ${formData.specialty === spec.id ? 'border-primary bg-primary/5' : 'border-line bg-surface hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1'}`}
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center bg-gradient-to-br ${spec.color} text-white shadow-lg transition-transform group-hover:scale-110`}>
                  <spec.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${formData.specialty === spec.id ? 'text-primary' : 'text-text-muted group-hover:text-text-main'}`}>Department</span>
                  <span className={`text-xl sm:text-2xl font-black transition-colors ${formData.specialty === spec.id ? 'text-slate-900' : 'text-slate-700'}`}>{spec.label}</span>
                  <p className="text-[10px] sm:text-[11px] text-text-muted font-medium line-clamp-2 mt-1">{spec.description}</p>
                </div>
                {formData.specialty === spec.id && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                )}
              </button>
            ))}
          </div>
        );

      case 'input_history':
        return (
          <div className="flex flex-col gap-6">

            {/* Input Method Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
              {[
                { id: 'voice', label: 'Voice Recording', icon: Mic },
                { id: 'direct', label: 'Direct Entry', icon: ClipboardList },
                { id: 'doc', label: 'Upload Document', icon: FileUp }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setHistoryTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${historyTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Views */}
            {historyTab === 'voice' && (
              <div className="p-8 rounded-3xl bg-slate-900 text-white flex flex-col items-center gap-6 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl relative z-10 ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-primary'}`}>
                  <button
                    onClick={() => startVoiceInput('historyInput')}
                    className="w-full h-full rounded-full flex items-center justify-center text-white"
                  >
                    {isRecording ? <MicOff className="w-8 h-8 animate-bounce" /> : <Mic className="w-8 h-8" />}
                  </button>
                </div>
                <div className="text-center space-y-2 relative z-10">
                  <h4 className="text-lg font-black tracking-tight">{isRecording ? 'Dictating Live Patient History...' : 'Start Clinical Recording'}</h4>
                  <p className="text-xs text-white/60 max-w-sm">Tap mic & start dictating the history. Our AI filters background noise, extracting key medical structures.</p>
                  {isRecording && (
                    <div className="text-primary font-bold text-sm tracking-widest mt-2">
                      REMAINING TIME: {recordingTimeLeft}s
                    </div>
                  )}
                </div>
              </div>
            )}

            {historyTab === 'direct' && (() => {
              let sections = [];
              if (formData.specialty === 'Pediatrics') {
                sections = [
                  { id: 'demographics', label: 'Demographics', sub: 'Patient registry details', icon: UserIcon },
                  { id: 'complaint', label: 'Presenting Complaint', sub: 'Chief complaint & duration', icon: AlertCircle },
                  { id: 'hpc', label: 'History of Pres. Complaint', sub: 'Chronological clinical presentation', icon: ClipboardList },
                  { id: 'review', label: 'Review of other Systems', sub: 'Systemic status inquiry', icon: Activity },
                  { id: 'medical', label: 'Past Medical History', sub: 'Comorbidities & med regimes', icon: HeartPulse },
                  { id: 'surgical', label: 'Past Surgical History', sub: 'Prior surgeries & trauma', icon: Syringe },
                  { id: 'ped_prenatal', label: 'Antenatal and Natal History', sub: 'Pregnancy & birth course', icon: Baby },
                  { id: 'ped_dev_immune', label: 'Dev & Immunization History', sub: 'Milestones & vaccines', icon: Microscope },
                  { id: 'ped_nutrition', label: 'Nutritional History', sub: 'Feeding & weaning details', icon: ClipboardList },
                  { id: 'family_social', label: 'Family-Social History', sub: 'Hereditary & social factors', icon: Users },
                  { id: 'physical_exam', label: 'Physical Examination', sub: 'Objective clinical exam logs', icon: StethoscopeIcon }
                ];
              } else if (formData.specialty === 'Obstetrics & Gynecology') {
                sections = [
                   { id: 'demographics', label: 'Demographics', sub: 'Patient registry details', icon: UserIcon },
                   { id: 'complaint', label: 'Presenting Complaint', sub: 'Chief complaint & duration', icon: AlertCircle },
                   { id: 'hpc', label: 'History of Pres. Complaint', sub: 'Chronological clinical presentation', icon: ClipboardList },
                   { id: 'review', label: 'Review of other Systems', sub: 'Systemic status inquiry', icon: Activity },
                   { id: 'obg_current_obstetric', label: 'Current Obstetrics History', sub: 'Gravida/Parity & current pregnancy', icon: Baby },
                   { id: 'obg_past_obstetric', label: 'Past Obstetrics History', sub: 'Prior labor & neonatal events', icon: ClipboardList },
                   { id: 'obg_gynae', label: 'Past Gynaecological History', sub: 'Cycles, menses & screening', icon: Microscope },
                   { id: 'medical', label: 'Past Medical History', sub: 'Comorbidities & med regimes', icon: HeartPulse },
                   { id: 'surgical', label: 'Past Surgical History', sub: 'Prior surgeries & trauma', icon: Syringe },
                   { id: 'family_social', label: 'Family-Social History', sub: 'Hereditary & social factors', icon: Users },
                   { id: 'physical_exam', label: 'Physical Examination', sub: 'Objective clinical exam logs', icon: StethoscopeIcon }
                ];
              } else {
                sections = [
                  { id: 'demographics', label: 'Demographics', sub: 'Patient registry details', icon: UserIcon },
                  { id: 'complaint', label: 'Presenting Complaint', sub: 'Chief complaint & duration', icon: AlertCircle },
                  { id: 'hpc', label: 'History of Pres. Complaint', sub: 'Chronological clinical presentation', icon: ClipboardList },
                  { id: 'review', label: 'Review of other Systems', sub: 'Systemic status inquiry', icon: Activity },
                  { id: 'medical', label: 'Past Medical History', sub: 'Comorbidities & med regimes', icon: HeartPulse },
                  { id: 'surgical', label: 'Past Surgical History', sub: 'Prior surgeries & trauma', icon: Syringe },
                  { id: 'family_social', label: 'Family-Social History', sub: 'Hereditary & social factors', icon: Users },
                  { id: 'physical_exam', label: 'Physical Examination', sub: 'Objective clinical exam logs', icon: StethoscopeIcon }
                ];
              }

              return (
                <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                  {/* Form Sub-navigation Sidebar */}
                  <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible no-scrollbar bg-slate-50/70 p-3.5 rounded-3xl border border-line lg:w-72 gap-2 shrink-0 shadow-xs">
                    <div className="hidden lg:flex items-center justify-between px-3 py-1 mb-2 border-b border-line/40 pb-2">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Clinical Dossier</span>
                      <span className="text-[8px] px-2 py-0.5 bg-accent/10 text-accent font-bold uppercase rounded-md tracking-widest">{formData.specialty || 'Wards'}</span>
                    </div>
                    {sections.map((sec) => {
                      const isActive = directSection === sec.id;
                      const Icon = sec.icon;
                      
                      let isCompleted = false;
                      if (sec.id === 'demographics') isCompleted = !!(formData.fullName?.trim() || formData.age || formData.sex);
                      if (sec.id === 'complaint') isCompleted = !!(formData.chiefComplaint?.trim() || formData.duration?.trim());
                      if (sec.id === 'hpc') isCompleted = !!formData.historyInput?.trim();
                      if (sec.id === 'review') isCompleted = !!formData.reviewOfSystems?.trim();
                      if (sec.id === 'medical') isCompleted = !!(formData.pastMedicalHistory?.trim() || formData.medications?.trim() || formData.allergies?.trim());
                      if (sec.id === 'surgical') isCompleted = !!formData.pastSurgicalHistory?.trim();
                      if (sec.id === 'ped_prenatal') isCompleted = !!(formData.antenatalHistory?.trim() || formData.natalHistory?.trim());
                      if (sec.id === 'ped_dev_immune') isCompleted = !!(formData.immunizationHistory?.trim() || formData.developmentalHistory?.trim());
                      if (sec.id === 'ped_nutrition') isCompleted = !!formData.nutritionalHistory?.trim();
                      if (sec.id === 'obg_current_obstetric') isCompleted = !!(formData.gravida?.trim() || formData.parity?.trim() || formData.currentPregnancyDetails?.trim());
                      if (sec.id === 'obg_past_obstetric') isCompleted = !!formData.obstetricHistory?.trim();
                      if (sec.id === 'obg_gynae') isCompleted = !!formData.gynaecologicalHistory?.trim();
                      if (sec.id === 'family_social') isCompleted = !!formData.familySocialHistory?.trim();
                      if (sec.id === 'physical_exam') isCompleted = !!(formData.physicalExam?.trim() || formData.vitals_bp?.trim() || formData.vitals_pulse?.trim());

                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => {
                          setDirectSection(sec.id as any);
                        }}
                        className={`group flex items-start gap-3.5 px-4.5 py-3.5 rounded-xl text-left whitespace-nowrap lg:whitespace-normal text-xs transition-all active:scale-[0.98] w-full border ${
                          isActive 
                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.01]' 
                            : 'text-text-main bg-white border-slate-100/80 hover:border-line hover:shadow-xs'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-white/10 text-white' : 'bg-bg text-text-muted group-hover:text-primary group-hover:bg-primary/5 transition-colors'}`}>
                           <Icon className="w-4 h-4 shrink-0" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1 leading-normal">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] font-black uppercase tracking-wider ${isActive ? 'text-white' : 'text-text-main group-hover:text-primary'}`}>{sec.label}</span>
                            {isCompleted && (
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-white animate-pulse' : 'bg-emerald-500'}`} />
                            )}
                          </div>
                          <span className={`text-[9px] font-medium leading-relaxed mt-0.5 tracking-wide ${isActive ? 'text-white/80 animate-fade-in' : 'text-text-muted'}`}>{sec.sub}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Form Content Panel */}
                <div className="flex-1 p-6 md:p-8 rounded-3xl border border-line bg-surface min-h-[440px] flex flex-col justify-between shadow-xs relative">
                  <div>
                    {directSection === 'complaint' && (
                      <div className="space-y-6">
                        <div className="border-b border-line/40 pb-4">
                          <h4 className="font-black text-base uppercase tracking-wider text-slate-800">Presenting Complaint</h4>
                          <p className="text-[10px] text-text-muted mt-0.5">Record the primary reason for seeking medical attention and chronological duration.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <InputField 
                            label="Presenting Complaint" 
                            placeholder="e.g., Acute onset epigastric pain" 
                            value={formData.chiefComplaint} 
                            onChange={(v: any) => updateField('chiefComplaint', v)} 
                          />
                          <InputField 
                            label="Duration / Course" 
                            placeholder="e.g., 5 days" 
                            value={formData.duration} 
                            onChange={(v: any) => updateField('duration', v)} 
                          />
                        </div>
                      </div>
                    )}

                    {directSection === 'demographics' && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="border-b border-line/40 pb-4">
                          <h4 className="font-black text-base uppercase tracking-wider text-slate-800">Patient Demographics</h4>
                          <p className="text-[10px] text-text-muted mt-0.5">Log standard patient demographics and admission details.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <InputField 
                            label="Patient Initials" 
                            placeholder="e.g., J.D." 
                            value={formData.fullName} 
                            onChange={(v: any) => updateField('fullName', v)} 
                          />
                          <SelectField 
                            label="Age (years)" 
                            options={Array.from({ length: 121 }, (_, i) => i.toString())} 
                            value={formData.age} 
                            onChange={(v: any) => updateField('age', v)} 
                          />
                          <SelectField 
                            label="Sex" 
                            options={['Male', 'Female', 'Other']} 
                            value={formData.sex} 
                            onChange={(v: any) => updateField('sex', v)} 
                          />
                          <InputField 
                            label="Tribe / Ethnicity" 
                            placeholder="e.g., Mutooro, Munyankole" 
                            value={formData.ethnicity} 
                            onChange={(v: any) => updateField('ethnicity', v)} 
                          />
                          <InputField 
                            label="Address" 
                            placeholder="e.g., Makindye, Kampala" 
                            value={formData.address} 
                            onChange={(v: any) => updateField('address', v)} 
                          />
                          <InputField 
                            label="Religion" 
                            placeholder="e.g., Anglican, Catholic, Muslim" 
                            value={formData.religion} 
                            onChange={(v: any) => updateField('religion', v)} 
                          />
                          <InputField 
                            label="Occupation" 
                            placeholder="e.g., Business Person, Nurse" 
                            value={formData.occupation} 
                            onChange={(v: any) => updateField('occupation', v)} 
                          />
                          <InputField 
                            label="Next of Kin (Initials)" 
                            placeholder="e.g., T.M." 
                            value={formData.nextOfKin} 
                            onChange={(v: any) => updateField('nextOfKin', v)} 
                          />
                          <InputField 
                            label="Relationship" 
                            placeholder="e.g., Spouse, Sibling" 
                            value={formData.relationship} 
                            onChange={(v: any) => updateField('relationship', v)} 
                          />
                          <InputField 
                            label="Registration No" 
                            placeholder="e.g., 23-025209" 
                            value={formData.registrationNo} 
                            onChange={(v: any) => updateField('registrationNo', v)} 
                          />
                          <InputField 
                            label="Ward" 
                            placeholder="e.g., Nassolo Ward" 
                            value={formData.ward} 
                            onChange={(v: any) => updateField('ward', v)} 
                          />
                          <InputField 
                            label="Bed space" 
                            placeholder="e.g., Bed G" 
                            value={formData.bed} 
                            onChange={(v: any) => updateField('bed', v)} 
                          />
                          <InputField 
                            label="Date of Admission" 
                            type="date" 
                            value={formData.admissionDate} 
                            onChange={(v: any) => updateField('admissionDate', v)} 
                          />
                          <InputField 
                            label="Date of Discharge" 
                            type="date" 
                            value={formData.dischargeDate} 
                            onChange={(v: any) => updateField('dischargeDate', v)} 
                          />
                        </div>
                      </div>
                    )}

                    {directSection === 'hpc' && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="border-b border-line/40 pb-4">
                          <h4 className="font-black text-base uppercase tracking-wider text-slate-800">History of Presenting Complaint</h4>
                          <p className="text-[10px] text-text-muted mt-0.5">Chronologically detail the clinical presentation history of the patient.</p>
                        </div>

                        <TextAreaField 
                          label="Detailed Narrative Chronology" 
                          placeholder="Detail the chronological progression of symptoms, aggravating, relieving factors, pertinent negatives..." 
                          value={formData.historyInput} 
                          rows={10}
                          onChange={(v: any) => updateField('historyInput', v)} 
                          onVoiceInput={() => startVoiceInput('historyInput')} 
                          isRecording={recordingField === 'historyInput'} 
                          isTranscribing={transcribingField === 'historyInput'} 
                          recordingTimeLeft={recordingTimeLeft} 
                        />
                      </div>
                    )}

                    {directSection === 'ped_prenatal' && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="border-b border-line/40 pb-4">
                          <h4 className="font-black text-base uppercase tracking-wider text-slate-800">Antenatal & Natal History (Pediatrics)</h4>
                          <p className="text-[10px] text-text-muted mt-0.5">Record antenatal details, maternal vaccines, gestation, delivery mode, and birth weight.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-5">
                          <TextAreaField 
                            label="Antenatal History (ANC, supplements, illness)" 
                            placeholder="Detail maternal ANC attendance, supplements taken, Tetanus vaccines, malaria prophylaxis, or pregnancy illnesses..." 
                            value={formData.antenatalHistory} 
                            rows={4}
                            onChange={(v: any) => updateField('antenatalHistory', v)} 
                          />
                          <TextAreaField 
                            label="Natal & Neonatal History" 
                            placeholder="Detail gestation age, mode of delivery, birth weight, immediate cry, APGAR score, or resuscitation history..." 
                            value={formData.natalHistory} 
                            rows={4}
                            onChange={(v: any) => updateField('natalHistory', v)} 
                          />
                        </div>
                      </div>
                    )}

                    {directSection === 'ped_dev_immune' && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="border-b border-line/40 pb-4">
                          <h4 className="font-black text-base uppercase tracking-wider text-slate-800">Dev & Immunization History</h4>
                          <p className="text-[10px] text-text-muted mt-0.5">Record childhood developmental milestones and immunization schedule compliance.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-5">
                          <TextAreaField 
                            label="Immunization History" 
                            placeholder="Detail vaccines received, compliant with UNEPI schedule, last vaccine received..." 
                            value={formData.immunizationHistory} 
                            rows={3}
                            onChange={(v: any) => updateField('immunizationHistory', v)} 
                            onVoiceInput={() => startVoiceInput('immunizationHistory')}
                            isRecording={recordingField === 'immunizationHistory'}
                            isTranscribing={transcribingField === 'immunizationHistory'}
                            recordingTimeLeft={recordingTimeLeft}
                          />
                          <TextAreaField 
                            label="Developmental History" 
                            placeholder="Detail milestones reached (motor, speech, social) and if they are age-appropriate..." 
                            value={formData.developmentalHistory} 
                            rows={3}
                            onChange={(v: any) => updateField('developmentalHistory', v)} 
                            onVoiceInput={() => startVoiceInput('developmentalHistory')}
                            isRecording={recordingField === 'developmentalHistory'}
                            isTranscribing={transcribingField === 'developmentalHistory'}
                            recordingTimeLeft={recordingTimeLeft}
                          />
                        </div>
                      </div>
                    )}

                    {directSection === 'ped_nutrition' && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="border-b border-line/40 pb-4">
                          <h4 className="font-black text-base uppercase tracking-wider text-slate-800">Nutritional History</h4>
                          <p className="text-[10px] text-text-muted mt-0.5">Record breastfeeding duration, exclusive status, and weaning schedules.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-5">
                          <TextAreaField 
                            label="Nutritional History" 
                            placeholder="Breastfeeding duration, exclusive status, weaning food timing/types, or general feeding patterns..." 
                            value={formData.nutritionalHistory} 
                            rows={6}
                            onChange={(v: any) => updateField('nutritionalHistory', v)} 
                            onVoiceInput={() => startVoiceInput('nutritionalHistory')}
                            isRecording={recordingField === 'nutritionalHistory'}
                            isTranscribing={transcribingField === 'nutritionalHistory'}
                            recordingTimeLeft={recordingTimeLeft}
                          />
                        </div>
                      </div>
                    )}

                    {directSection === 'obg_current_obstetric' && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="border-b border-line/40 pb-4">
                          <h4 className="font-black text-base uppercase tracking-wider text-slate-800">Current Obstetrics History</h4>
                          <p className="text-[10px] text-text-muted mt-0.5">Record Gravidity, Parity, LMP, EDD, and progress of the current pregnancy.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <InputField 
                            label="Gravida (G)" 
                            placeholder="e.g., 3" 
                            value={formData.gravida} 
                            onChange={(v: any) => updateField('gravida', v)} 
                          />
                          <InputField 
                            label="Parity (P)" 
                            placeholder="e.g., 1+1" 
                            value={formData.parity} 
                            onChange={(v: any) => updateField('parity', v)} 
                          />
                          <InputField 
                            label="LMP" 
                            placeholder="e.g., DD/MM/YY" 
                            value={formData.lmp} 
                            onChange={(v: any) => updateField('lmp', v)} 
                          />
                          <InputField 
                            label="EDD / WOA" 
                            placeholder="e.g., 35 weeks" 
                            value={formData.edd} 
                            onChange={(v: any) => updateField('edd', v)} 
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-5">
                          <TextAreaField 
                            label="Current Pregnancy Course" 
                            placeholder="Inquire about ANC attendance, vaccinations received, complications or active symptoms..." 
                            value={formData.currentPregnancyDetails} 
                            rows={6}
                            onChange={(v: any) => updateField('currentPregnancyDetails', v)} 
                            onVoiceInput={() => startVoiceInput('currentPregnancyDetails')}
                            isRecording={recordingField === 'currentPregnancyDetails'}
                            isTranscribing={transcribingField === 'currentPregnancyDetails'}
                            recordingTimeLeft={recordingTimeLeft}
                          />
                        </div>
                      </div>
                    )}

                    {directSection === 'obg_past_obstetric' && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="border-b border-line/40 pb-4">
                          <h4 className="font-black text-base uppercase tracking-wider text-slate-800">Past Obstetrics History</h4>
                          <p className="text-[10px] text-text-muted mt-0.5">Record previous pregnancy outcomes, delivery modes, birth weights, and complications.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-5">
                          <TextAreaField 
                            label="Past Deliveries / Pregnancies" 
                            placeholder="Record previous delivery outcomes, modes, birth weight, and neonatal/postpartum complications..." 
                            value={formData.obstetricHistory} 
                            rows={6}
                            onChange={(v: any) => updateField('obstetricHistory', v)} 
                            onVoiceInput={() => startVoiceInput('obstetricHistory')}
                            isRecording={recordingField === 'obstetricHistory'}
                            isTranscribing={transcribingField === 'obstetricHistory'}
                            recordingTimeLeft={recordingTimeLeft}
                          />
                        </div>
                      </div>
                    )}

                    {directSection === 'obg_gynae' && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="border-b border-line/40 pb-4">
                          <h4 className="font-black text-base uppercase tracking-wider text-slate-800">Gynaecological History</h4>
                          <p className="text-[10px] text-text-muted mt-0.5">Record menstrual cycle, contraception use, and screening tests.</p>
                        </div>
                        <TextAreaField 
                          label="Detailed Gynaecological History" 
                          placeholder="Detail age of menarche, cycle frequency, duration and flow. Document active contraceptive methods, sexual history, cervical cancer screenings..." 
                          value={formData.gynaecologicalHistory} 
                          rows={8}
                          onChange={(v: any) => updateField('gynaecologicalHistory', v)} 
                          onVoiceInput={() => startVoiceInput('gynaecologicalHistory')}
                          isRecording={recordingField === 'gynaecologicalHistory'}
                          isTranscribing={transcribingField === 'gynaecologicalHistory'}
                          recordingTimeLeft={recordingTimeLeft} 
                        />
                      </div>
                    )}

                    {directSection === 'review' && (
                      <div className="space-y-6">
                        <div className="border-b border-line/40 pb-4">
                          <h4 className="font-black text-base uppercase tracking-wider text-slate-800">Review of Systems (ROS)</h4>
                          <p className="text-[10px] text-text-muted mt-0.5">Screen for additional minor or related clinical clues across all other organ systems.</p>
                        </div>
                        <TextAreaField 
                          label="Systemic Review" 
                          placeholder="Inquire or document any other related systemic findings (Cardiovascular, Respiratory, gastrointestinal etc.)..." 
                          value={formData.reviewOfSystems} 
                          rows={10}
                          onChange={(v: any) => updateField('reviewOfSystems', v)} 
                          onVoiceInput={() => startVoiceInput('reviewOfSystems')} 
                          isRecording={recordingField === 'reviewOfSystems'} 
                          isTranscribing={transcribingField === 'reviewOfSystems'} 
                          recordingTimeLeft={recordingTimeLeft} 
                        />
                      </div>
                    )}

                    {directSection === 'medical' && (
                      <div className="space-y-6">
                        <div className="border-b border-line/40 pb-4">
                          <h4 className="font-black text-base uppercase tracking-wider text-slate-800">Past Medical History</h4>
                          <p className="text-[10px] text-text-muted mt-0.5">Capture any relevant chronic illnesses, active medication regimens, and adverse drug reactions.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-5">
                          <TextAreaField 
                            label="Co-morbidities & Conditions" 
                            placeholder="List any past chronic conditions (Hypertension, Diabetes, Asthma etc.) or Childhood illnesses..." 
                            value={formData.pastMedicalHistory} 
                            rows={4}
                            onChange={(v: any) => updateField('pastMedicalHistory', v)} 
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <InputField 
                              label="Current Medications" 
                              placeholder="e.g., Metformin 500mg daily" 
                              value={formData.medications} 
                              onChange={(v: any) => updateField('medications', v)} 
                            />
                            <InputField 
                              label="Known Allergies" 
                              placeholder="e.g., Penicillin (Anaphylactic)" 
                              value={formData.allergies} 
                              onChange={(v: any) => updateField('allergies', v)} 
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {directSection === 'surgical' && (
                      <div className="space-y-6">
                        <div className="border-b border-line/40 pb-4">
                          <h4 className="font-black text-base uppercase tracking-wider text-slate-800">Past Surgical History</h4>
                          <p className="text-[10px] text-text-muted mt-0.5">Detail previous operations, traumas, blood transfusions, and post-procedural course.</p>
                        </div>
                        <TextAreaField 
                          label="Prior Surgical Procedures & Trauma" 
                          placeholder="Record past operations, surgeries, dates of intervention and relevant blood transfusion histories..." 
                          value={formData.pastSurgicalHistory} 
                          rows={10}
                          onChange={(v: any) => updateField('pastSurgicalHistory', v)} 
                          onVoiceInput={() => startVoiceInput('pastSurgicalHistory')} 
                          isRecording={recordingField === 'pastSurgicalHistory'} 
                          isTranscribing={transcribingField === 'pastSurgicalHistory'} 
                          recordingTimeLeft={recordingTimeLeft} 
                        />
                      </div>
                    )}

                    {directSection === 'family_social' && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="border-b border-line/40 pb-4">
                          <h4 className="font-black text-base uppercase tracking-wider text-slate-800">Family & Social History</h4>
                          <p className="text-[10px] text-text-muted mt-0.5">Inquire about chronic hereditary conditions, sibling status, home sanitation, source of water, and parents' employment.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                          <InputField 
                            label="Hereditary Diseases (Asthma, HTN, Sickle Cell...)" 
                            placeholder="e.g., Asthma/Hypertension in maternal/paternal relatives" 
                            value={formData.fsh_hereditary} 
                            onChange={(v: any) => updateField('fsh_hereditary', v)} 
                          />
                          <InputField 
                            label="Home Sanitation & Water" 
                            placeholder="e.g., Piped water, Pit latrine vs flush toilet" 
                            value={formData.fsh_sanitation} 
                            onChange={(v: any) => updateField('fsh_sanitation', v)} 
                          />
                          <InputField 
                            label="Employment / Caregiver Support" 
                            placeholder="e.g., Stable employment and childcare support structures" 
                            value={formData.fsh_employment} 
                            onChange={(v: any) => updateField('fsh_employment', v)} 
                          />
                        </div>

                        <TextAreaField 
                          label="Comprehensive Family and Social History Narrative" 
                          placeholder="Detail family composition, additional environmental risks, pets, soft blanket, or housing material details..." 
                          value={formData.familySocialHistory} 
                          rows={6}
                          onChange={(v: any) => updateField('familySocialHistory', v)} 
                          onVoiceInput={() => startVoiceInput('familySocialHistory')} 
                          isRecording={recordingField === 'familySocialHistory'} 
                          isTranscribing={transcribingField === 'familySocialHistory'} 
                          recordingTimeLeft={recordingTimeLeft} 
                        />
                      </div>
                    )}

                    {directSection === 'physical_exam' && renderPhysicalExamForm()}
                  </div>

                  {/* Quick Assist Presets Panel */}
                  <div className="mt-8 pt-6 border-t border-line/60 bg-bg/30 -mx-6 -mb-6 md:-mx-8 md:-mb-8 p-6 md:p-8 rounded-b-3xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-[10px] font-black text-text-main uppercase tracking-wider">Clinical Quick Insertion Templates</span>
                    </div>
                    <p className="text-[10px] text-text-muted leading-relaxed mb-4">Click to append premium structured documentation templates securely into this form step.</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {directSection === 'complaint' && [
                        { label: "Acute Epigastric Pain (5d)", values: { chiefComplaint: "Acute onset epigastric pain", duration: "5 days" } },
                        { label: "High-Grade Fever (3d)", values: { chiefComplaint: "High-grade fever accompanied by chills", duration: "3 days" } },
                        { label: "Productive Cough (2w)", values: { chiefComplaint: "Persistent productive cough with thick yellowish sputum", duration: "2 weeks" } },
                        { label: "Generalized Dizziness (2d)", values: { chiefComplaint: "Generalized dizziness and lightheadedness worsening on standing", duration: "2 days" } }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            updateField('chiefComplaint', item.values.chiefComplaint);
                            updateField('duration', item.values.duration);
                          }}
                          className="px-3 py-1.5 bg-white border border-line rounded-lg text-[10px] font-bold text-text-main hover:border-primary hover:text-primary active:scale-[0.98] cursor-pointer transition-all shadow-2xs"
                        >
                          + {item.label}
                        </button>
                      ))}

                      {directSection === 'hpc' && [
                        { label: "Typical Acute Progression", text: "The patient presents with an acute onset of symptoms which started suddenly and progress over hours. The pain is described as severe, constant, and localized. It is aggravated by movement and slightly relieved by rest." },
                        { label: "Slowly Progressive Chronic History", text: "Symptoms began gradually several months ago and have been slowly progressive. The intensity varies from mild to moderate. There are no clear relieving or aggravating factors. The patient reports general fatigue." },
                        { label: "Intermittent / Relapsing", text: "Symptomatology is reported to be episodic. Episodes last several hours, featuring severe distress, but completely resolve in between. Currently experiencing an active acute flare-up." }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const existing = formData.historyInput || '';
                            const text = item.text;
                            updateField('historyInput', existing.trim() ? `${existing.trim()}\n\n${text}` : text);
                          }}
                          className="px-3 py-1.5 bg-white border border-line rounded-lg text-[10px] font-bold text-text-main hover:border-primary hover:text-primary active:scale-[0.98] cursor-pointer transition-all shadow-2xs"
                        >
                          + {item.label}
                        </button>
                      ))}

                      {directSection === 'review' && [
                        { label: "Clear / All Systems Unremarkable", text: "Constitutional: No fever, chills, or weight changes. Cardiorespiratory: No chest pain, palpitations, cough, or dyspnea. Gastrointestinal: No abdominal pain, dysphagia, nausea, or bowel changes. Neurological: No headache, dizziness, or sensory deficits." },
                        { label: "Cardiorespiratory Normal", text: "Cardiovascular: No chest pain, orthopnea, or ankle swelling. Respiratory: Lungs are reported to be clear, with no cough, wheezing, or shortness of breath." },
                        { label: "Gastrointestinal Normal", text: "GI: No nausea, vomiting, diarrhea, or constipation. Normal appetite and digestion reported." }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const existing = formData.reviewOfSystems || '';
                            const text = item.text;
                            updateField('reviewOfSystems', existing.trim() ? `${existing.trim()}\n\n${text}` : text);
                          }}
                          className="px-3 py-1.5 bg-white border border-line rounded-lg text-[10px] font-bold text-text-main hover:border-primary hover:text-primary active:scale-[0.98] cursor-pointer transition-all shadow-2xs"
                        >
                          + {item.label}
                        </button>
                      ))}

                      {directSection === 'medical' && [
                        { label: "Unremarkable Medical History", values: { pastMedicalHistory: "No prior history of major chronic conditions or systemic illnesses.", medications: "None", allergies: "No known drug allergies (NKDA)" } },
                        { label: "Controlled HTN & Type 2 DM", values: { pastMedicalHistory: "Essential Hypertension and Type 2 Diabetes Mellitus, both diagnosed ~5 years ago and managed medically.", medications: "Metformin 500mg daily, Amlodipine 5mg daily", allergies: "NKDA" } },
                        { label: "Bronchial Asthma Baseline", values: { pastMedicalHistory: "Mild persistent bronchial asthma diagnosed in childhood, well controlled.", medications: "Salbutamol inhaler as needed", allergies: "Dust mites, pollen" } }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            updateField('pastMedicalHistory', item.values.pastMedicalHistory);
                            updateField('medications', item.values.medications);
                            updateField('allergies', item.values.allergies);
                          }}
                          className="px-3 py-1.5 bg-white border border-line rounded-lg text-[10px] font-bold text-text-main hover:border-primary hover:text-primary active:scale-[0.98] cursor-pointer transition-all shadow-2xs"
                        >
                          + {item.label}
                        </button>
                      ))}

                      {directSection === 'surgical' && [
                        { label: "No Prior Surgeries", text: "No prior surgical interventions, hospitalizations, or major traumas reported. Uncomplicated transfusion history (none)." },
                        { label: "Prior Appendectomy", text: "Prior appendectomy performed under general anesthesia ten years ago with uncomplicated postoperative recovery." },
                        { label: "Prior Cholecystectomy", text: "Prior laparoscopic cholecystectomy completed five years ago with no history of delayed healing or postsurgical complications." }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const existing = formData.pastSurgicalHistory || '';
                            const text = item.text;
                            updateField('pastSurgicalHistory', existing.trim() ? `${existing.trim()}\n\n${text}` : text);
                          }}
                          className="px-3 py-1.5 bg-white border border-line rounded-lg text-[10px] font-bold text-text-main hover:border-primary hover:text-primary active:scale-[0.98] cursor-pointer transition-all shadow-2xs"
                        >
                          + {item.label}
                        </button>
                      ))}

                      {directSection === 'family_social' && [
                        { label: "Healthy Nuclear Family Composition", text: "Living in a nuclear family. Sibling development and health status is fully appropriate. Home environment is stable, brick-built construction with piped clean water and proper sanitation." },
                        { label: "No Hereditary Conditions", text: "No reported history of hypertension, cardiovascular illnesses, diabetes mellitus, asthma, or sickle cell anemia among first-degree maternal or paternal relatives." },
                        { label: "Parents Employed & Supported", text: "Parents are both employed with stable income. Active family and community care structures available for childcare support." }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const existing = formData.familySocialHistory || '';
                            const text = item.text;
                            updateField('familySocialHistory', existing.trim() ? `${existing.trim()}\n\n${text}` : text);
                          }}
                          className="px-3 py-1.5 bg-white border border-line rounded-lg text-[10px] font-bold text-text-main hover:border-primary hover:text-primary active:scale-[0.98] cursor-pointer transition-all shadow-2xs"
                        >
                          + {item.label}
                        </button>
                      ))}

                      {directSection === 'ped_prenatal' && [
                        { label: "Uncomplicated Term Delivery", text: "Maternal history: Attended all standard antenatal visits, took required iron/folic supplements, and received tetanus vaccines. Term gestation, uneventful spontaneous vaginal delivery (SVD), immediate clean cry on birth, birth weight 3.2 kg, no nursery admission." },
                        { label: "Preterm ANC Attended", text: "Moderate preterm gestation at 34 weeks, delivered via emergency Caesarean section due to maternal pre-eclampsia. Received surfactant therapy, spent 5 days in neonatal ICU before stable discharge." }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            updateField('antenatalHistory', "Mother attended standard ANC visits, took supplements, vaccinated.");
                            updateField('natalHistory', item.text);
                          }}
                          className="px-3 py-1.5 bg-white border border-line rounded-lg text-[10px] font-bold text-text-main hover:border-primary hover:text-primary active:scale-[0.98] cursor-pointer transition-all shadow-2xs"
                        >
                          + {item.label}
                        </button>
                      ))}

                      {directSection === 'ped_dev_immune' && [
                        { label: "All Milestones Appropriate", text: "Child's physical, motor, language, cognitive, and social milestones are fully appropriate and synchronized for age. Exclusive breastfed for 6 months, successfully transitioned to soft family solids." },
                        { label: "Vaccinations Up-To-Date (UNEPI)", text: "Fully immunized and up-to-date with all age-appropriate vaccines according to the UNEPI national guideline immunization schedule." }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            updateField('immunizationHistory', "Immunized up to date per UNEPI.");
                            updateField('developmentalHistory', item.text);
                          }}
                          className="px-3 py-1.5 bg-white border border-line rounded-lg text-[10px] font-bold text-text-main hover:border-primary hover:text-primary active:scale-[0.98] cursor-pointer transition-all shadow-2xs"
                        >
                          + {item.label}
                        </button>
                      ))}

                      {directSection === 'obg_current_obstetric' && [
                        { label: "Primigravida (Current G1P0)", text: "Patient is a Primigravida (G1P0). Current pregnancy conceived naturally, with early ANC booking and uneventful progress so far. Routine supplements started, normal fetal movements documented." },
                        { label: "Multiparous Previous SVDs", text: "A G3P2, with history of two prior spontaneous vaginal term deliveries. Both babies born at local hospital, normal weights, no postpartum hemorrhage or severe neonatal complications." }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            updateField('gravida', "3");
                            updateField('parity', "2+0");
                            updateField('obstetricHistory', item.text);
                          }}
                          className="px-3 py-1.5 bg-white border border-line rounded-lg text-[10px] font-bold text-text-main hover:border-primary hover:text-primary active:scale-[0.98] cursor-pointer transition-all shadow-2xs"
                        >
                          + {item.label}
                        </button>
                      ))}

                      {directSection === 'obg_gynae' && [
                        { label: "Menstrual Cycle Normal", text: "Menarche at age 13. Regular 28-day menstrual cycle lasting 4-5 days of moderate flow, minimal dysmenorrhea. Last cervical screening done 2 years ago (negative pap test)." },
                        { label: "Regular Screening & Contraception", text: "Menstrual cycles are predictable. Sits on intrauterine contraceptive device (IUD) for family planning with good tolerability. No prior STIs or pelvic inflammatory disease (PID) history." }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            updateField('gynaecologicalHistory', item.text);
                          }}
                          className="px-3 py-1.5 bg-white border border-line rounded-lg text-[10px] font-bold text-text-main hover:border-primary hover:text-primary active:scale-[0.98] cursor-pointer transition-all shadow-2xs"
                        >
                          + {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
              );
            })()}

            {historyTab === 'doc' && (
              <FileUpload 
                label="Clinical Supporting Document" 
                subtitle="SUPPORTING PDF OR CLINICAL RECORD TEXT" 
                onFileSelect={handleFileProcessing}
                isProcessing={isProcessingFile}
              />
            )/* removed physical image upload option per user instruction */}

            {/* Live Synchronized Value Indicator */}
            {formData.historyInput && (
              <div className="space-y-2 mt-4">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Live Documented History Block</span>
                <div className="p-4 rounded-xl border border-line bg-slate-50 text-xs text-slate-700 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto no-scrollbar">
                  {formData.historyInput}
                </div>
              </div>
            )}
          </div>
        );

      case 'physical_exam':
        return renderPhysicalExamForm();

      case 'compiled_report':
        return (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Raw notes panel */}
              <div className="p-6 rounded-2xl border border-line bg-surface space-y-4">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Original Clinician Notes</span>
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-800">Specialty Chosen:</span>
                    <p className="text-slate-600 mt-1">{formData.specialty}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">History Narratives:</span>
                    <p className="text-slate-600 mt-1 whitespace-pre-line">{formData.historyInput || 'No history recorded.'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Examination Findings:</span>
                    <p className="text-slate-600 mt-1 whitespace-pre-line">{formData.physicalExam || 'No examination documented.'}</p>
                  </div>
                </div>
              </div>

              {/* Cognitive AI compilation panel */}
              <div className="p-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-surface space-y-4 flex flex-col min-h-[400px]">
                <div className="flex justify-between items-center border-b border-line pb-4 pb-safe">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Cognitive AI Synthesized Report
                  </span>
                  {syncedStoryData && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">
                      Ready
                    </span>
                  )}
                </div>

                {syncedStoryData ? (
                  <div className="flex-1 overflow-y-auto max-h-[400px] space-y-4 text-xs leading-relaxed text-slate-700">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 border-b border-line pb-1 mb-2">HPC Narratives</h4>
                      <p>{syncedStoryData.hpcNarrative}</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 border-b border-line pb-1 mb-2">Review of Systems</h4>
                      <p>{syncedStoryData.rosNarrative}</p>
                    </div>
                    {syncedStoryData.obGynNarrative && syncedStoryData.obGynNarrative !== 'N/A' && (
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 border-b border-line pb-1 mb-2">Ob/Gyn History</h4>
                        <p>{syncedStoryData.obGynNarrative}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 border-b border-line pb-1 mb-2">Clinical Impression</h4>
                      <p className="font-semibold text-primary">{syncedStoryData.impression}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Sparkles className="w-6 h-6 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black text-slate-800">Synthesize Formal Case Story</h4>
                      <p className="text-xs text-text-muted">Generate a fully compiled, structured diagnostic report layout backed by evidence-based medicine.</p>
                    </div>
                    <button
                      onClick={handleAISynthesis}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-accent text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" />
                      Begin Compilation
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'generate_output':
        return (
          <div className="flex flex-col gap-6">
            {/* Split layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Output Left: Presentation, PPT slides */}
              <div className="space-y-6">
                {/* PPT Download Box */}
                <div className="p-6 rounded-2xl border border-line bg-surface flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 leading-tight">Download slide show deck</h4>
                    <p className="text-xs text-text-muted">Extract diagnostic slides fully loaded for screens.</p>
                  </div>
                  <button
                    onClick={() => generatePPT(formData, syncedStoryData || {})}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold text-xs uppercase tracking-wider hover:shadow-xl transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    PPTX Slides
                  </button>
                </div>

                {/* PDF Download Box */}
                <div className="p-6 rounded-2xl border border-line bg-surface flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 leading-tight">Download Case Write-Up</h4>
                    <p className="text-xs text-text-muted">Export clean, structured medical write-up document.</p>
                  </div>
                  <button
                    onClick={downloadStoryReport}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    Case Write-Up
                  </button>
                </div>

                {/* Medical Presentation Script with player */}
                <div className="p-6 rounded-2xl border border-line bg-surface space-y-4 shadow-sm">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Ward Round Presentation Script</span>
                  
                  {/* TTS Player Widget */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-line flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const speechText = syncedStoryData?.wardRoundPresentation || syncedStoryData?.impression || "Nothing compiled yet";
                          if (isPlayingAudio) {
                            stopSpeechSynthesis();
                          } else {
                            startSpeechSynthesis(speechText);
                          }
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all ${isPlayingAudio ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-accent hover:scale-105'}`}
                      >
                        {isPlayingAudio ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
                      </button>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">{isPlayingAudio ? 'AI Speaker Active' : 'Listen to AI Script'}</span>
                        <span className="text-[10px] text-text-muted font-medium">Text-To-Speech Senior voice</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Speed</span>
                      <select
                        value={audioSpeed}
                        onChange={(e) => {
                          setAudioSpeed(parseFloat(e.target.value));
                          if (isPlayingAudio) {
                            stopSpeechSynthesis();
                            setTimeout(() => {
                              const speechText = syncedStoryData?.wardRoundPresentation || syncedStoryData?.impression || "No content found";
                              startSpeechSynthesis(speechText);
                            }, 300);
                          }
                        }}
                        className="px-2 py-1 bg-white border border-line rounded text-xs text-slate-700 focus:outline-none focus:border-primary"
                      >
                        <option value="0.75">0.75x</option>
                        <option value="1">1.0x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-600 italic border-l-2 border-primary pl-4 py-1">
                    {syncedStoryData?.wardRoundPresentation || "Please compile the report in Step 3 to auto-generate the ward round presentation summary."}
                  </p>
                </div>
              </div>

              {/* PPT Slides visually rendered right side */}
              <div className="p-6 rounded-2xl border border-line bg-surface space-y-4 flex flex-col shadow-sm">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">PowerPoint Deck Layout Preview</span>
                <div className="flex-1 overflow-y-auto max-h-[360px] space-y-3 pr-1">
                  {[
                    { title: "Slide 1: Title & Demographics", desc: `Patient Initials: ${formData.fullName || 'Initials'} | Age: ${formData.age || 'N/A'}yrs | Sex: ${formData.sex || 'N/A'}` },
                    { title: "Slide 2: History of Present Illness", desc: syncedStoryData?.hpcNarrative || "History summary narrative..." },
                    { title: "Slide 3: Differentials List", desc: syncedStoryData?.differentials?.map((d: any) => d.diagnosis).join(', ') || "Synthesized working diagnoses..." },
                    { title: "Slide 4: Management & Directives Plan", desc: syncedStoryData?.plan?.join(', ') || "Lab diagnostic clinical orders..." }
                  ].map((slide, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-line bg-slate-50 space-y-1">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-wide block">{slide.title}</span>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{slide.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'ai_suggestions':
        return (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Differential Diagnoses */}
              <div className="space-y-4">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">Differential Diagnoses</span>
                <div className="space-y-4">
                  {syncedStoryData?.differentials ? (
                    syncedStoryData.differentials.map((diff: any, index: number) => (
                      <div key={index} className="p-5 rounded-2xl border border-line bg-surface flex gap-4 shadow-sm items-start hover:border-primary/20 transition-all">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="font-bold text-slate-800 text-sm">{diff.diagnosis}</span>
                          <p className="text-xs text-slate-500 leading-relaxed">{diff.reasoning}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 rounded-2xl border border-dashed border-line text-center text-xs text-text-muted bg-slate-50">
                      No differential diagnoses compiled yet. Proceed with step 3 AI synthesis first.
                    </div>
                  )}
                </div>
              </div>

              {/* Priority Investigations & Management suggestions Column */}
              <div className="space-y-6">
                {/* Lab investigations */}
                <div className="space-y-4">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">Priority Medical Investigations</span>
                  <div className="space-y-4">
                    {(syncedStoryData?.priorityInvestigations || syncedStoryData?.plan) ? (
                      (syncedStoryData?.priorityInvestigations || syncedStoryData?.plan || []).map((item: string, index: number) => (
                        <div key={index} className="p-5 rounded-2xl border border-line bg-surface flex gap-4 shadow-sm items-start hover:border-primary/20 transition-all">
                          <div className="w-8 h-8 rounded-xl bg-laravel/10 text-rose-500 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                            🔬
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="font-bold text-slate-800 text-sm">Lab / Imaging Order {index + 1}</span>
                            <p className="text-xs text-slate-500 leading-relaxed">{item}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 rounded-2xl border border-dashed border-line text-center text-xs text-text-muted bg-slate-50">
                        No investigative action items compiled yet. Proceed with step 3 AI synthesis first.
                      </div>
                    )}
                  </div>
                </div>

                {/* Management Suggestions */}
                <div className="space-y-4">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">Clinical Management Suggestions</span>
                  
                  {/* Add Custom Suggestion Input */}
                  {syncedStoryData && (
                    <div className="flex gap-2 items-center bg-emerald-50/10 border border-emerald-100 p-2 rounded-2xl shadow-3xs">
                      <input
                        type="text"
                        value={customSuggestionText}
                        onChange={(e) => setCustomSuggestionText(e.target.value)}
                        placeholder="Add dynamic diagnostic or treatment instruction..."
                        className="text-xs text-slate-800 placeholder-slate-400 bg-transparent flex-1 focus:outline-none px-2"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddCustomSuggestion();
                        }}
                      />
                      <button
                        onClick={handleAddCustomSuggestion}
                        className="p-1 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 font-sans"
                      >
                        + Add
                      </button>
                    </div>
                  )}

                  <div className="space-y-4">
                    {(syncedStoryData?.managementSuggestions || syncedStoryData?.plan) ? (
                      (syncedStoryData?.managementSuggestions || syncedStoryData?.plan || []).map((item: string, index: number) => {
                        const isInPlan = syncedStoryData?.plan?.some((p: string) => p.trim().toLowerCase() === item.trim().toLowerCase());
                        return (
                          <div 
                            key={index} 
                            className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 shadow-sm relative ${
                              isInPlan 
                                ? "border-emerald-200 bg-emerald-50/20" 
                                : "border-slate-200 bg-slate-50/30 opacity-75 hover:opacity-100"
                            }`}
                          >
                            <div className="flex gap-4 items-start">
                              <button
                                onClick={() => handleToggleSuggestionInPlan(item)}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5 transition-all outline-none ${
                                  isInPlan 
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs" 
                                    : "bg-slate-100 text-slate-450 border border-slate-200 hover:bg-slate-200 hover:text-slate-600"
                                }`}
                                title={isInPlan ? "Active in write-up. Click to exclude." : "Excluded. Click to include."}
                              >
                                {isInPlan ? "✓" : "＋"}
                              </button>
                              
                              <div className="flex-1 min-w-0 flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`font-bold text-sm leading-none ${isInPlan ? "text-emerald-950" : "text-slate-600"}`}>
                                    Therapeutic Action {index + 1}
                                  </span>
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    isInPlan ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                                  }`}>
                                    {isInPlan ? "In Plan" : "Excluded"}
                                  </span>
                                </div>
                                
                                <textarea
                                  value={item}
                                  rows={1}
                                  onChange={(e) => handleUpdateSuggestionText(index, e.target.value)}
                                  className="text-xs leading-relaxed bg-transparent border-0 focus:ring-0 focus:outline-none p-0 resize-none font-medium text-slate-700 w-full hover:bg-slate-100/50 p-1 rounded transition-colors"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 rounded-2xl border border-dashed border-line text-center text-xs text-text-muted bg-slate-50">
                        No management suggestions compiled yet. Proceed with step 3 AI synthesis first.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderPhysicalExamForm = () => {
    return (
      <div className="space-y-6 animate-fade-in text-left">
        <div className="border-b border-line/40 pb-4">
          <h4 className="font-black text-base uppercase tracking-wider text-slate-800">Physical Examination</h4>
          <p className="text-[10px] text-text-muted mt-0.5 font-medium">Log vital parameters, systemic diagnostic observations, and target physical findings.</p>
        </div>

        {/* Skip Examination Option Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-100 p-5 rounded-2xl">
          <div className="text-left">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">Haven't examined patient yet?</span>
            <span className="text-xs text-slate-500 leading-normal block mt-1">You may skip the physical examination. The report compiler will note this as "Not Examined" and proceed immediately.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              updateField('physicalExamSkipped', true);
              updateField('vitals_bp', '');
              updateField('vitals_pulse', '');
              updateField('vitals_temp', '');
              updateField('vitals_rr', '');
              updateField('vitals_spo2', '');
              updateField('phys_general_exam', '');
              updateField('phys_respiratory', '');
              updateField('phys_cns', '');
              updateField('phys_cvs', '');
              updateField('phys_abdomen', '');
              updateField('physicalExam', 'Physical examination was not performed.');
              
              if (currentStepIndex < activeSteps.length - 1) {
                setCompletedSteps(prev => {
                  const s = new Set(prev);
                  s.add('physical_exam');
                  return s;
                });
                setCurrentStepIndex(currentStepIndex + 1);
              }
            }}
            className="px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shrink-0 active:scale-95"
          >
            Skip Physical Exam
          </button>
        </div>

        {/* Vitals Grid */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-line/60 space-y-4 shadow-2xs">
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider block">1. Vital Signs & General Exam</span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <InputField 
              label="BP (mmHg)" 
              placeholder="e.g., 120/80" 
              value={formData.vitals_bp} 
              onChange={(v: any) => updateField('vitals_bp', v)} 
            />
            <InputField 
              label="Pulse Rate (bpm)" 
              placeholder="e.g., 72" 
              value={formData.vitals_pulse} 
              onChange={(v: any) => updateField('vitals_pulse', v)} 
            />
            <InputField 
              label="Temp (°C)" 
              placeholder="e.g., 36.8" 
              value={formData.vitals_temp} 
              onChange={(v: any) => updateField('vitals_temp', v)} 
            />
            <InputField 
              label="Resp Rate (/min)" 
              placeholder="e.g., 16" 
              value={formData.vitals_rr} 
              onChange={(v: any) => updateField('vitals_rr', v)} 
            />
            <InputField 
              label="SpO2 (%)" 
              placeholder="e.g., 98%" 
              value={formData.vitals_spo2} 
              onChange={(v: any) => updateField('vitals_spo2', v)} 
            />
          </div>
          <InputField 
            label="General Condition Description" 
            placeholder="e.g., Patient alert, cooperative, not pale, not dehydrated, non-icteric" 
            value={formData.phys_general_exam} 
            onChange={(v: any) => updateField('phys_general_exam', v)} 
            onVoiceInput={() => startVoiceInput('phys_general_exam')}
            isRecording={recordingField === 'phys_general_exam'}
            isTranscribing={transcribingField === 'phys_general_exam'}
            recordingTimeLeft={recordingTimeLeft}
          />
        </div>

        {/* Systemic Examination Blocks */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black text-slate-850 uppercase tracking-wider">2. Systemic Examination Logs</span>
            <div className="flex flex-wrap gap-1.5 ml-auto animate-fade-in">
              {[
                { label: "Normal Chest/Resp", text: "Chest wall symmetrical, normal expansion. Respiration vesicular with clear lungs bilaterally, no crepitations or wheezes heard." },
                { label: "Normal CNS", text: "Alert, oriented to time, place, and person. GCS 15/15. Pupils equal and reactive to light. Active limb movement, no gross motor or sensory deficits. Cranial nerves intact." }
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    if (chip.label.includes("CNS")) {
                      updateField('phys_cns', chip.text);
                    } else {
                      updateField('phys_respiratory', chip.text);
                    }
                  }}
                  className="px-2 py-0.5 bg-white border border-line rounded text-[9px] font-bold text-slate-600 hover:text-primary hover:border-primary active:scale-95 shadow-3xs transition-all"
                >
                  + {chip.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextAreaField 
              label="Respiratory Examination" 
              placeholder="Lungs clear, chest wall moves symmetrically, normal vesicular breath sounds, no added crackles or wheezes..." 
              value={formData.phys_respiratory} 
              rows={3}
              onChange={(v: any) => updateField('phys_respiratory', v)} 
              onVoiceInput={() => startVoiceInput('phys_respiratory')}
              isRecording={recordingField === 'phys_respiratory'}
              isTranscribing={transcribingField === 'phys_respiratory'}
              recordingTimeLeft={recordingTimeLeft}
            />
            <TextAreaField 
              label="Central Nervous System (CNS) Examination" 
              placeholder="Alert, oriented to time/place/person, GCS 15/15, Pupils active to light, motor power 5/5, reflexes normal..." 
              value={formData.phys_cns} 
              rows={3}
              onChange={(v: any) => updateField('phys_cns', v)} 
              onVoiceInput={() => startVoiceInput('phys_cns')}
              isRecording={recordingField === 'phys_cns'}
              isTranscribing={transcribingField === 'phys_cns'}
              recordingTimeLeft={recordingTimeLeft}
            />
            <TextAreaField 
              label="Cardiovascular (CVS) Examination" 
              placeholder="Precordium quiet, apex beat in 5th intercostal space MCL, S1 S2 heard clarity, no murmurs..." 
              value={formData.phys_cvs} 
              rows={3}
              onChange={(v: any) => updateField('phys_cvs', v)} 
              onVoiceInput={() => startVoiceInput('phys_cvs')}
              isRecording={recordingField === 'phys_cvs'}
              isTranscribing={transcribingField === 'phys_cvs'}
              recordingTimeLeft={recordingTimeLeft}
            />
            <TextAreaField 
              label="Abdomen & Other Regional Exam" 
              placeholder="Abdomen flat, soft, non-tender, no hepatosplenomegaly, normal bowel sounds..." 
              value={formData.phys_abdomen} 
              rows={3}
              onChange={(v: any) => updateField('phys_abdomen', v)} 
              onVoiceInput={() => startVoiceInput('phys_abdomen')}
              isRecording={recordingField === 'phys_abdomen'}
              isTranscribing={transcribingField === 'phys_abdomen'}
              recordingTimeLeft={recordingTimeLeft}
            />
          </div>
        </div>

        {/* Miscellaneous / Other Summary findings */}
        <TextAreaField 
          label="Additional Physical Examination Details & Comprehensive Summary" 
          placeholder="Detailed description of wound dressings, surgical sites, reflexes, skin layers, or other specialized diagnostic notes..." 
          value={formData.physicalExam} 
          rows={4}
          onChange={(v: any) => updateField('physicalExam', v)} 
          onVoiceInput={() => startVoiceInput('physicalExam')} 
          isRecording={recordingField === 'physicalExam'} 
          isTranscribing={transcribingField === 'physicalExam'} 
          recordingTimeLeft={recordingTimeLeft} 
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row font-sans text-text-main overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-surface border-r border-line flex-col h-screen sticky top-0 shrink-0">
        <div className="p-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl pink-gradient flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
            <img src="/images/logo.png" alt="Malae Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-2xl text-text-main leading-none tracking-tight">Malae</span>
            <span className="text-[9px] font-bold text-primary uppercase tracking-[0.3em] mt-1">Health Intelligence</span>
          </div>
        </div>

        <nav className="flex-1 px-6 py-8 flex flex-col gap-2 overflow-y-auto no-scrollbar">
          <button
            onClick={() => setView('dashboard')}
            className={`
              flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group active:scale-[0.98]
              ${view === 'dashboard' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-bg hover:text-primary'}
            `}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Dashboard</span>
          </button>

          <button
            onClick={() => setView('profile')}
            className={`
              flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group active:scale-[0.98]
              ${view === 'profile' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-bg hover:text-primary'}
            `}
          >
            <UserIcon className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Physician Profile</span>
          </button>

          {view === 'generator' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 space-y-2"
            >
              <div className="px-5 py-2 border-b border-line mb-4">
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em]">Case Progress</span>
              </div>
              {activeSteps.map((step, index) => {
                const isActive = currentStepIndex === index;
                const isCompleted = completedSteps.has(step.id);
                const Icon = step.icon;

                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStepIndex(index)}
                    className={`
                      w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group relative active:scale-[0.98]
                      ${isActive ? 'bg-bg text-primary border border-line shadow-sm' : 'text-text-muted hover:bg-bg'}
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded-lg flex items-center justify-center transition-all
                      ${isActive ? 'bg-primary text-white' : isCompleted ? 'bg-emerald-50 text-emerald-500' : 'bg-line text-text-muted'}
                    `}>
                      {isCompleted && !isActive ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </nav>

        <div className="p-8 border-t border-line space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-bg border border-line">
            <div className="w-10 h-10 rounded-xl pink-gradient flex items-center justify-center text-white font-bold text-lg">
              {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'P'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-text-main truncate uppercase tracking-widest">{user.displayName || 'Physician'}</span>
              <span className="text-[9px] text-text-muted truncate font-medium">{user.email}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-muted hover:text-red-500 hover:bg-red-50 transition-all font-bold text-[10px] uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            SIGN OUT
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            {/* Drawer Content */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-72 bg-surface border-r border-line flex flex-col h-full shadow-2xl z-10"
            >
              <div className="p-6 flex items-center justify-between border-b border-line">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl pink-gradient flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
                    <img src="/images/logo.png" alt="Malae Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-lg text-text-main leading-none">Malae</span>
                    <span className="text-[8px] font-bold text-primary uppercase tracking-[0.2em] mt-1">Health Intel</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-2 text-text-muted hover:text-red-500 rounded-lg bg-bg hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto no-scrollbar">
                <button
                  onClick={() => {
                    setView('dashboard');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`
                    flex items-center gap-4 px-4 py-3 rounded-xl transition-all active:scale-[0.98] w-full
                    ${view === 'dashboard' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-bg'}
                  `}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    setView('profile');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`
                    flex items-center gap-4 px-4 py-3 rounded-xl transition-all active:scale-[0.98] w-full
                    ${view === 'profile' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-bg'}
                  `}
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Physician Profile</span>
                </button>

                {view === 'generator' && (
                  <div className="mt-8 space-y-2">
                    <div className="px-4 py-1 border-b border-line mb-2">
                      <span className="text-[8px] font-bold text-text-muted uppercase tracking-[0.2em]">Case Progress</span>
                    </div>
                    {activeSteps.map((step, index) => {
                      const isActive = currentStepIndex === index;
                      const isCompleted = completedSteps.has(step.id);
                      const Icon = step.icon;

                      return (
                        <button
                          key={step.id}
                          onClick={() => {
                            setCurrentStepIndex(index);
                            setIsMobileSidebarOpen(false);
                          }}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left active:scale-[0.98]
                            ${isActive ? 'bg-bg text-primary border border-line' : 'text-text-muted hover:bg-bg'}
                          `}
                        >
                          <div className={`
                            w-5 h-5 rounded flex items-center justify-center transition-all shrink-0
                            ${isActive ? 'bg-primary text-white' : isCompleted ? 'bg-emerald-50 text-emerald-500' : 'bg-line text-text-muted'}
                          `}>
                            {isCompleted && !isActive ? <CheckCircle2 className="w-2.5 h-2.5 animate-bounce-once" /> : <Icon className="w-2.5 h-2.5" />}
                          </div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                            {step.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </nav>

              <div className="p-6 border-t border-line space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-bg border border-line">
                  <div className="w-8 h-8 rounded-lg pink-gradient flex items-center justify-center text-white font-bold text-sm">
                    {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'P'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-text-main truncate uppercase tracking-wider">{user?.displayName || 'Physician'}</span>
                    <span className="text-[8px] text-text-muted truncate font-medium">{user?.email}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all font-bold text-[9px] uppercase tracking-wider border border-line"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-surface border-b border-line px-6 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 -ml-2 text-text-main hover:text-primary transition-colors focus:outline-none"
              aria-label="Toggle Side Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-8 h-8 rounded-lg pink-gradient flex items-center justify-center shadow-sm overflow-hidden">
              <img src="/images/logo.png" alt="Malae Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <span className="font-bold text-text-main tracking-tight text-lg">Malae</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleLogout}
              className="p-2 text-text-muted hover:text-red-500 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {view === 'dashboard' ? (
          <div className="flex-1 overflow-y-auto">
            <Dashboard 
              reports={allReports}
              user={user}
              onNewReport={() => {
                setFormData({});
                setCurrentStepIndex(0);
                setCompletedSteps(new Set());
                setGeneratorMode('form');
                setSyncedStoryData(null);
                setView('generator');
                setSelectedReport(null);
              }}
              onSelectReport={(report) => {
                setSelectedReport(report);
                setFormData(report.patientData || {});
                setSyncedStoryData(report.reportData || null);
                setView('viewer');
              }}
              onDeleteReport={(id) => {
                setShowConfirmModal({
                  show: true,
                  title: 'Delete Record',
                  message: 'Are you sure you want to permanently delete this clinical record?',
                  onConfirm: () => {
                    handleDeleteReport(id);
                    setShowConfirmModal(prev => ({ ...prev, show: false }));
                  }
                });
              }}
              onInviteCollaborator={handleInviteCollaborator}
            />
          </div>
        ) : view === 'profile' ? (
          <div className="flex-1 overflow-y-auto">
            <Profile onBack={() => setView('dashboard')} />
          </div>
        ) : view === 'viewer' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10">
            <div className="max-w-4xl mx-auto">
              <button 
                onClick={() => setView('dashboard')}
                className="flex items-center gap-2 text-text-muted hover:text-primary font-black text-[10px] sm:text-xs md:text-sm mb-4 sm:mb-6 transition-colors group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="uppercase tracking-widest">Back to My Cases</span>
              </button>
              
              <div className="bg-white rounded-[2rem] sm:rounded-[32px] p-6 sm:p-8 md:p-12 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sm:mb-12 pb-8 sm:pb-12 border-b border-slate-50">
                  <div className="space-y-2">
                    <h1 className="text-xl sm:text-3xl font-black text-slate-900 leading-tight">{selectedReport.title}</h1>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-[10px] sm:text-sm text-slate-500 font-medium flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {selectedReport.createdAt?.toDate ? selectedReport.createdAt.toDate().toLocaleDateString() : 'Recently'}
                      </p>
                      <span className={`text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-[0.15em] border ${
                        selectedReport.type === 'story' 
                          ? 'bg-primary/5 text-primary border-primary/20' 
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {selectedReport.type === 'story' ? 'Case Story' : 'Case Details'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={async () => {
                        const blob = await pdf(<MedicalReportPDF formData={selectedReport.patientData} steps={activeSteps} />).toBlob();
                        triggerDownload(blob, `Clinical_Report_${selectedReport.patientData.fullName || 'Patient'}`);
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-[10px] hover:bg-slate-200 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="uppercase tracking-widest">Original Report</span>
                    </button>

                    <button 
                      onClick={async () => {
                        if (selectedReport.type === 'story') {
                          const blob = await pdf(<ClinicalCaseStoryPDF formData={selectedReport.patientData} storyData={selectedReport.reportData} title={selectedReport.title} />).toBlob();
                          triggerDownload(blob, `Case_Story_${selectedReport.patientData.fullName || 'Patient'}`);
                        } else {
                          alert("This is a clinical record. Generate a Case Story first to access AI-Assisted Compilation.");
                        }
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-bold text-[10px] hover:bg-accent transition-all shadow-lg shadow-primary/10 active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="uppercase tracking-widest">AI Compilation</span>
                    </button>

                    <button 
                      onClick={() => {
                        setFormData(selectedReport.patientData);
                        setCurrentStepIndex(0);
                        setView('generator');
                        setGeneratorMode('form');
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white font-bold text-[10px] hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span className="uppercase tracking-widest">Edit Case</span>
                    </button>

                    <button 
                      onClick={() => {
                        if (selectedReport.type === 'story') {
                          generatePPT(selectedReport.patientData, selectedReport.reportData);
                        } else {
                          alert("Generate a Case Story first to create a PowerPoint presentation.");
                        }
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-[10px] hover:bg-slate-200 transition-all active:scale-95"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span className="uppercase tracking-widest">PowerPoint</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-8 sm:space-y-12">
                  {selectedReport.type === 'story' ? (
                    <>
                      <section>
                        <h2 className="text-base sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-3">
                          <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-primary rounded-full" />
                          Case Summary
                        </h2>
                        <p className="text-slate-600 leading-relaxed text-sm sm:text-lg font-medium">{selectedReport.reportData.hpcNarrative}</p>
                      </section>

                      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-100">
                          <h3 className="font-black text-slate-900 mb-3 uppercase text-[9px] sm:text-[10px] tracking-widest">Clinical Impression</h3>
                          <p className="text-sm sm:text-base text-slate-700 font-bold">{selectedReport.reportData.impression}</p>
                        </div>
                        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-100">
                          <h3 className="font-black text-slate-900 mb-3 uppercase text-[9px] sm:text-[10px] tracking-widest">Management Plan</h3>
                          <ul className="space-y-2">
                            {selectedReport.reportData.plan?.map((item: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0 mt-0.5" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </section>

                      <section>
                        <h2 className="text-base sm:text-xl font-black text-slate-900 mb-6">Possible Diagnoses</h2>
                        <div className="space-y-3 sm:space-y-4">
                          {selectedReport.reportData.differentials?.map((diff: any, i: number) => (
                            <div key={i} className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-line hover:border-primary/30 transition-colors bg-surface shadow-sm">
                              <h4 className="font-black text-sm sm:text-base text-slate-900 mb-2 tracking-tight">{i + 1}. {diff.diagnosis}</h4>
                              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">{diff.reasoning}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  ) : (
                    <div className="space-y-8">
                      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patient Name</p>
                          <p className="text-sm font-black text-slate-900">{selectedReport.patientData.fullName || 'Not recorded'}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Presenting Complaint</p>
                          <p className="text-sm font-black text-slate-900">{selectedReport.patientData.chiefComplaint || 'Not recorded'}</p>
                        </div>
                      </section>
                      
                      <section>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 mb-4">Clinical History</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-slate-100">
                            <h4 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">History of Presenting Complaint</h4>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap font-medium">{selectedReport.patientData.historyInput || 'No data recorded'}</p>
                          </div>
                          {selectedReport.patientData.reviewOfSystems && (
                            <div className="p-4 rounded-xl border border-slate-100">
                              <h4 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Review of Systems</h4>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap font-medium">{selectedReport.patientData.reviewOfSystems}</p>
                            </div>
                          )}
                          <div className="p-4 rounded-xl border border-slate-100">
                            <h4 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Past Medical History</h4>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap font-medium">{selectedReport.patientData.pastMedicalHistory || 'No data recorded'}</p>
                          </div>
                          {selectedReport.patientData.pastSurgicalHistory && (
                            <div className="p-4 rounded-xl border border-slate-100">
                              <h4 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Past Surgical History</h4>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap font-medium">{selectedReport.patientData.pastSurgicalHistory}</p>
                            </div>
                          )}
                        </div>
                      </section>

                      <div className="p-6 sm:p-8 rounded-[2rem] bg-primary/5 border border-primary/10 text-center">
                        <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
                        <h4 className="font-black text-slate-900 mb-2">Write a case story?</h4>
                        <p className="text-xs text-slate-500 mb-6 font-medium">Create a professional narrative summary from these details.</p>
                          <button 
                            onClick={() => {
                              setFormData(selectedReport.patientData);
                              setCurrentStepIndex(0);
                              setCompletedSteps(new Set(activeSteps.map(s => s.id))); // Mark all as done
                              setView('generator');
                            }}
                            className="px-8 py-3 rounded-xl bg-primary text-white text-xs font-black hover:bg-accent transition-all shadow-lg shadow-primary/20 uppercase tracking-widest"
                          >
                            History write up with AI
                          </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 sm:px-10 py-4 sm:py-6 flex items-center justify-between">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex flex-col">
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-widest">
                    Case Story Generator
                  </h2>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                    Step {currentStepIndex + 1} of {STEPS.length}: {STEPS[currentStepIndex].title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-6">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">{auth.currentUser?.displayName || 'Healthcare Professional'}</span>
                  <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Clinical Workspace</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {(auth.currentUser?.displayName || 'H').charAt(0).toUpperCase()}
                </div>
              </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 py-6 sm:py-8 md:py-12">
              <div className="max-w-4xl mx-auto">
                <AnimatePresence mode="wait">
                  {generatorMode === 'selection' ? (
                    <motion.div
                      key="selection"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex flex-col gap-6 sm:gap-8 md:gap-10"
                    >
                      <div className="flex flex-col gap-4 text-center md:text-left">
                        <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-text-main leading-tight uppercase tracking-widest">Start New Case</h2>
                        <p className="text-sm sm:text-base md:text-xl text-text-muted font-medium">Choose your preferred method of clinical data entry.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <button 
                          onClick={() => setGeneratorMode('form')}
                          className="group p-10 rounded-2xl bg-surface border border-line shadow-sm hover:shadow-xl transition-all flex flex-col items-center text-center gap-8 relative overflow-hidden active:scale-[0.98]"
                        >
                          <div className="w-20 h-20 rounded-xl bg-bg text-text-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500">
                            <ClipboardList className="w-10 h-10" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-text-main mb-3 uppercase tracking-widest group-hover:text-primary transition-colors">Direct Form</h3>
                            <p className="text-xs text-text-muted leading-relaxed font-medium">Enter case details manually using our structured clinical form.</p>
                          </div>
                          <div className="mt-auto flex items-center gap-2 text-primary font-bold text-[10px] opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <span className="uppercase tracking-widest">Proceed</span> <ChevronRight className="w-4 h-4" />
                          </div>
                        </button>

                        <button 
                          onClick={() => setGeneratorMode('upload')}
                          className="group p-10 rounded-2xl bg-surface border border-line shadow-sm hover:shadow-xl transition-all flex flex-col items-center text-center gap-8 relative overflow-hidden active:scale-[0.98]"
                        >
                          <div className="w-20 h-20 rounded-xl bg-bg text-text-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500">
                            <FileUp className="w-10 h-10" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-text-main mb-3 uppercase tracking-widest group-hover:text-primary transition-colors">Document Upload</h3>
                            <p className="text-xs text-text-muted leading-relaxed font-medium">Upload a PDF or image of clinical notes to extract data automatically.</p>
                          </div>
                          <div className="mt-auto flex items-center gap-2 text-primary font-bold text-[10px] opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <span className="uppercase tracking-widest">Upload File</span> <ChevronRight className="w-4 h-4" />
                          </div>
                        </button>

                        <button 
                          onClick={() => setGeneratorMode('audio')}
                          className="group p-10 rounded-2xl bg-surface border border-line shadow-sm hover:shadow-xl transition-all flex flex-col items-center text-center gap-8 relative overflow-hidden active:scale-[0.98]"
                        >
                          <div className="w-20 h-20 rounded-xl bg-bg text-text-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500">
                            <Mic className="w-10 h-10" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-text-main mb-3 uppercase tracking-widest group-hover:text-primary transition-colors">Audio Input</h3>
                            <p className="text-xs text-text-muted leading-relaxed font-medium">Dictate the case details and let AI transcribe and organize the data.</p>
                          </div>
                          <div className="mt-auto flex items-center gap-2 text-primary font-bold text-[10px] opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <span className="uppercase tracking-widest">Start Recording</span> <ChevronRight className="w-4 h-4" />
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  ) : generatorMode === 'upload' ? (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col gap-6 sm:gap-8 max-w-2xl mx-auto"
                    >
                      <button 
                        onClick={() => setGeneratorMode('selection')}
                        className="flex items-center gap-2 text-text-muted hover:text-primary font-bold text-[10px] sm:text-xs transition-colors self-start"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 sm:w-4 h-4" />
                        BACK TO OPTIONS
                      </button>
                      
                      <div className="bg-surface rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-12 shadow-sm border border-line text-center">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-primary/5 text-primary flex items-center justify-center mx-auto mb-6 sm:mb-8">
                          <FileUp className="w-8 h-8 sm:w-12 sm:h-12" />
                        </div>
                        <h2 className="text-xl sm:text-3xl font-black text-text-main mb-2 sm:mb-4">Upload Clinical Document</h2>
                        <p className="text-xs sm:text-base text-text-muted mb-8 sm:mb-10 leading-relaxed">Select a PDF or image file (clinical notes, lab results, etc.) to extract patient data.</p>
                        
                        <FileUpload 
                          label={isProcessingFile ? "Processing Document..." : "Select Document"}
                          subtitle="PDF OR IMAGE (MAX 10MB)"
                          onFileSelect={handleFullCaseFileProcessing}
                          isProcessing={isProcessingFile}
                        />
                      </div>
                    </motion.div>
                  ) : generatorMode === 'audio' ? (
                    <motion.div
                      key="audio"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col gap-6 sm:gap-8 max-w-2xl mx-auto"
                    >
                      <button 
                        onClick={() => setGeneratorMode('selection')}
                        className="flex items-center gap-2 text-text-muted hover:text-primary font-bold text-[10px] sm:text-xs transition-colors self-start"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 sm:w-4 h-4" />
                        BACK TO OPTIONS
                      </button>
                      
                      <div className="bg-surface rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-12 shadow-sm border border-line text-center">
                        <div className={`w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 transition-all duration-500 ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-2xl shadow-red-200' : 'bg-primary/5 text-primary'}`}>
                          {isRecording ? <MicOff className="w-8 h-8 sm:w-12 sm:h-12" /> : <Mic className="w-8 h-8 sm:w-12 sm:h-12" />}
                        </div>
                        <h2 className="text-xl sm:text-3xl font-black text-text-main mb-2 sm:mb-4">
                          {isRecording ? 'Capturing Case & Commands...' : 'Dictate Case & Commands'}
                        </h2>
                        <p className="text-xs sm:text-base text-text-muted mb-8 sm:mb-10 leading-relaxed max-w-md mx-auto">
                          {isRecording ? 'Speak clearly. Use voice commands like "Save" or "Generate" to control the flow.' : 'Our AI extracts clinical data and follows your voice commands automatically.'}
                        </p>
                        
                        <button 
                          onClick={startFullCaseAudioInput}
                          disabled={isProcessingFile}
                          className={`
                            w-full py-4 sm:py-6 rounded-xl sm:rounded-[2rem] font-black text-sm sm:text-lg transition-all flex items-center justify-center gap-3 sm:gap-4
                            ${isRecording 
                              ? 'bg-red-500 text-white shadow-xl shadow-red-200 hover:bg-red-600' 
                              : 'bg-primary text-white shadow-xl shadow-primary/20 hover:bg-accent'}
                            ${isProcessingFile ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          {isProcessingFile ? (
                            <>
                              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                              PROCESSING...
                            </>
                          ) : isRecording ? (
                            <>
                              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white animate-ping" />
                              STOP RECORDING
                            </>
                          ) : (
                            <>
                              <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                              START RECORDING
                            </>
                          )}
                        </button>
                        
                        {!isRecording && !isProcessingFile && (
                          <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4 sm:mt-6">
                            MAX DURATION: 2 MINUTES
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={currentStep.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-6 md:gap-10"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                          <div className="flex flex-col gap-1">
                            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-widest uppercase text-text-main leading-tight">{currentStep.title}</h2>
                            <p className="text-xs sm:text-sm md:text-lg text-text-muted font-medium">{currentStep.subtitle}</p>
                          </div>
                          <div className="hidden md:flex flex-col items-end gap-1">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Progress</span>
                            <div className="flex items-center gap-1.5">
                              {activeSteps.map((s, i) => (
                                <div 
                                  key={s.id} 
                                  className={`w-2 h-2 rounded-full transition-all duration-500 ${i <= currentStepIndex ? 'bg-primary scale-110' : 'bg-line'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden md:hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentStepIndex + 1) / activeSteps.length) * 100}%` }}
                            className="h-full bg-primary"
                          />
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl sm:rounded-3xl md:rounded-[40px] p-6 sm:p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
                        {renderStepContent(currentStep.id)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer Navigation */}
            <footer className="h-20 sm:h-24 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-4 sm:px-10 flex items-center justify-between sticky bottom-0 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
              <button 
                onClick={() => {
                  if (generatorMode === 'selection') {
                    setView('dashboard');
                  } else {
                    handlePrev();
                  }
                }}
                disabled={currentStepIndex === 0 && generatorMode === 'form'}
                className={`
                  flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs md:text-sm font-black transition-all active:scale-95
                  ${currentStepIndex === 0 && generatorMode === 'form' ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-50'}
                `}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="uppercase tracking-widest">{generatorMode === 'selection' ? 'Cancel' : 'Prev'}</span>
              </button>

              {generatorMode === 'form' && (
                <div className="flex items-center gap-2 sm:gap-4">
                  <button 
                    onClick={handleReset}
                    className="hidden sm:flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-red-50 text-red-600 text-xs font-black hover:bg-red-100 transition-all active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="uppercase tracking-widest">New Case</span>
                  </button>

                  {currentStepIndex === STEPS.length - 1 ? (
                    <button 
                      onClick={handleCompileReport}
                      disabled={isGenerating}
                      className="flex items-center gap-2 md:gap-3 px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-text-main text-white text-[11px] sm:text-xs md:text-sm font-black hover:bg-text-main/90 transition-all shadow-lg shadow-text-main/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="uppercase tracking-widest">Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span className="uppercase tracking-widest">Generate Story</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={handleNext}
                      className="flex items-center gap-2 md:gap-3 px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-primary text-white text-[11px] sm:text-xs md:text-sm font-black hover:bg-accent transition-all shadow-lg shadow-primary/20 group active:scale-95"
                    >
                      <span className="uppercase tracking-widest">Next</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>
              )}
            </footer>
          </>
        )}
        {/* Persistent Bottom Nav - Mobile */}
        <nav className="md:hidden h-[72px] bg-white border-t border-line flex items-center justify-around px-2 pb-safe z-50 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => setView('dashboard')}
            className={`flex flex-col items-center justify-center gap-1.5 w-16 transition-all ${view === 'dashboard' ? 'text-primary' : 'text-text-muted'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${view === 'dashboard' ? 'bg-primary/10 shadow-inner' : ''}`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-tight">Home</span>
          </button>

          <button
            onClick={() => {
              if (view !== 'generator') {
                setFormData({});
                setCurrentStepIndex(0);
                setCompletedSteps(new Set());
                setGeneratorMode('form');
                setView('generator');
                setSelectedReport(null);
              }
            }}
            className="flex flex-col items-center justify-center relative -top-3.5 transition-all w-16"
          >
            <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 ${view === 'generator' ? 'bg-primary text-white shadow-primary/30 rotate-45' : 'bg-slate-900 text-white shadow-slate-300'}`}>
              <Plus className={`w-5.5 h-5.5 ${view === 'generator' ? '-rotate-45' : ''}`} />
            </div>
            <span className={`text-[9.5px] font-black uppercase tracking-wider mt-1.5 transition-colors ${view === 'generator' ? 'text-primary' : 'text-text-muted'}`}>Create</span>
          </button>

          <button
            onClick={() => setView('profile')}
            className={`flex flex-col items-center justify-center gap-1.5 w-16 transition-all ${view === 'profile' ? 'text-primary' : 'text-text-muted'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${view === 'profile' ? 'bg-primary/10 shadow-inner' : ''}`}>
              <UserIcon className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-tight">Profile</span>
          </button>
        </nav>
      </main>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isGenerating && !showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-surface shadow-xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="text-center px-6">
              <h3 className="text-xl font-black text-text-main tracking-tight">Generating Case Story</h3>
              <p className="text-xs text-primary font-bold uppercase tracking-[0.2em] mt-2">{generationStatus || "Synthesizing clinical data..."}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Physical Exam Skip Modal */}
      <AnimatePresence>
        {showSkipExamModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSkipExamModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-surface rounded-[2rem] p-8 shadow-2xl border border-line"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-6 mx-auto animate-pulse">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-text-main text-center mb-2">Skip Examination?</h3>
              <p className="text-text-muted text-center text-xs leading-relaxed mb-8">
                You have not captured any physical findings or vitals for this patient. Skip the physical exam? The compiler will log "Physical examination was not performed." and proceed.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSkipExamModal(false)}
                  className="flex-1 py-3 rounded-xl border border-line text-text-muted font-bold text-xs hover:bg-bg transition-all uppercase tracking-wider"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateField('physicalExamSkipped', true);
                    updateField('physicalExam', 'Physical examination was not performed.');
                    setShowSkipExamModal(false);
                    if (currentStepIndex < activeSteps.length - 1) {
                      setCompletedSteps(prev => {
                        const s = new Set(prev);
                        s.add(currentStep.id);
                        return s;
                      });
                      setCurrentStepIndex(prev => prev + 1);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 transition-all uppercase tracking-wider shadow-md shadow-slate-200"
                >
                  Skip Exam
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Selection Modal */}
      <AnimatePresence>
        {showConfirmModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(prev => ({ ...prev, show: false }))}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-surface rounded-[2rem] p-8 shadow-2xl border border-line"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-6 mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-text-main text-center mb-2">{showConfirmModal.title}</h3>
              <p className="text-text-muted text-center text-sm mb-8">{showConfirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 py-3 rounded-xl border border-line text-text-muted font-bold text-xs hover:bg-bg transition-all"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    showConfirmModal.onConfirm();
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-all shadow-lg shadow-red-200"
                >
                  CONFIRM
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-surface rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 flex flex-col gap-6">
                <div className="flex flex-col gap-2 text-center">
                  <h3 className="text-2xl font-bold text-text-main">Choose Report Type</h3>
                  <p className="text-sm text-text-muted">Select how you would like your clinical data compiled.</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={downloadOriginalReport}
                    disabled={originalReportStatus !== 'idle'}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group text-left ${
                      originalReportStatus === 'error' ? 'border-red-200 bg-red-50' : 
                      originalReportStatus === 'completed' ? 'border-emerald-200 bg-emerald-50' :
                      'border-line hover:bg-bg'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      originalReportStatus === 'error' ? 'bg-red-500 text-white' :
                      originalReportStatus === 'completed' ? 'bg-emerald-500 text-white' :
                      'bg-bg text-text-muted group-hover:bg-primary group-hover:text-white'
                    }`}>
                      {originalReportStatus === 'generating' ? <Loader2 className="w-6 h-6 animate-spin" /> :
                       originalReportStatus === 'completed' ? <Check className="w-6 h-6" /> :
                       originalReportStatus === 'error' ? <AlertCircle className="w-6 h-6" /> :
                       <FileText className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold ${
                        originalReportStatus === 'error' ? 'text-red-700' :
                        originalReportStatus === 'completed' ? 'text-emerald-700' :
                        'text-text-main'
                      }`}>
                        {originalReportStatus === 'generating' ? 'Generating...' : 
                         originalReportStatus === 'completed' ? 'Download Complete' :
                         originalReportStatus === 'error' ? 'Generation Failed' :
                         'Original Report'}
                      </p>
                      <p className="text-[10px] text-text-muted uppercase tracking-tight">
                        {originalReportStatus === 'error' ? 'Please try again' : 'Structured clinical data capture'}
                      </p>
                    </div>
                    {originalReportStatus === 'idle' && <Download className="w-4 h-4 text-text-muted/30" />}
                  </button>

                  <button 
                    onClick={downloadStoryReport}
                    disabled={storyReportStatus !== 'idle'}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group text-left ${
                      storyReportStatus === 'error' ? 'border-red-200 bg-red-50' : 
                      storyReportStatus === 'completed' ? 'border-emerald-200 bg-emerald-50' :
                      'border-primary/20 bg-primary/5 hover:bg-primary/10'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      storyReportStatus === 'error' ? 'bg-red-500 text-white' :
                      storyReportStatus === 'completed' ? 'bg-emerald-500 text-white' :
                      'bg-primary text-white'
                    }`}>
                      {storyReportStatus === 'generating' ? <Loader size="sm" /> :
                       storyReportStatus === 'completed' ? <Check className="w-6 h-6" /> :
                       storyReportStatus === 'error' ? <AlertCircle className="w-6 h-6" /> :
                       <BookOpen className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold ${
                        storyReportStatus === 'error' ? 'text-red-700' :
                        storyReportStatus === 'completed' ? 'text-emerald-700' :
                        'text-primary'
                      }`}>
                        {storyReportStatus === 'generating' ? 'Writing...' : 
                         storyReportStatus === 'completed' ? 'Story Complete' :
                         storyReportStatus === 'error' ? 'Writing Failed' :
                         'Generate Case Story'}
                      </p>
                      <p className={`text-[10px] uppercase tracking-tight ${
                        storyReportStatus === 'error' ? 'text-red-400' :
                        storyReportStatus === 'completed' ? 'text-emerald-400' :
                        'text-primary/60'
                      }`}>
                        {storyReportStatus === 'error' ? 'Service unavailable' : 'A professional summary of the case.'}
                      </p>
                    </div>
                    {storyReportStatus === 'idle' && <Zap className="w-4 h-4 text-primary" />}
                  </button>
                </div>

                <button 
                  onClick={() => setShowReportModal(false)}
                  className="w-full py-3 text-xs font-bold text-text-muted hover:text-text-main transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
