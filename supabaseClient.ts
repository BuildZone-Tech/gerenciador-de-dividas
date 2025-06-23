
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Debtor, PaymentRecord, Installment, InstallmentType, InstallmentStatus } from './types';

// Define a type for your database schema
// Note: This 'Database' interface is becoming less accurate with precise types below.
// Consider removing it or aligning it more closely if it's used directly elsewhere.
export interface Database {
  public: {
    Tables: {
      debtors: {
        Row: any; // Using 'any' as DatabasePrecise is more specific
        Insert: any;
        Update: any;
      };
      payment_history: {
        Row: PaymentRecord;
        Insert: Omit<PaymentRecord, 'id' | 'created_at' | 'payment_date'> & { payment_date?: string; created_at?: string; };
        Update: Partial<Omit<PaymentRecord, 'id' | 'debtor_id' | 'user_id' | 'created_at'>>;
      };
      installments: { // Nova tabela para parcelas individuais do tipo FIXED
        Row: Installment;
        Insert: Omit<Installment, 'id' | 'created_at' | 'amount_paid' | 'status' | 'payment_ids'> & { amount_paid?: number; status?: InstallmentStatus; payment_ids?: string[]; created_at?: string; };
        Update: Partial<Omit<Installment, 'id' | 'debtor_id' | 'user_id' | 'created_at' | 'installment_number' | 'amount_due'>>;
      };
      app_settings: { // Nova tabela para configurações globais
        Row: any;
        Insert: any;
        Update: any;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
}

const hardcodedSupabaseUrl = 'https://ndeccbzojovpplozqftw.supabase.co';
const hardcodedSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZWNjYnpvam92cHBsb3pxZnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NjY0NzIsImV4cCI6MjA2NTE0MjQ3Mn0.hWjiWFljmwybIQ7SvnfUPvE0fF0UGCzA_LeO1OaVL7k';

const supabaseUrlFromEnv = typeof process !== 'undefined' && process.env && process.env.SUPABASE_URL;
const supabaseKeyFromEnv = typeof process !== 'undefined' && process.env && process.env.SUPABASE_ANON_KEY;

const supabaseUrlValue = supabaseUrlFromEnv || hardcodedSupabaseUrl;
const supabaseAnonKeyValue = supabaseKeyFromEnv || hardcodedSupabaseAnonKey;

const genericPlaceholderUrlString = 'YOUR_SUPABASE_URL_PLACEHOLDER';
const genericPlaceholderKeyString = 'YOUR_SUPABASE_ANON_KEY_PLACEHOLDER';

const isEmptyUrl = !supabaseUrlValue;
const isEmptyKey = !supabaseAnonKeyValue;
const isStillGenericPlaceholderUrl = supabaseUrlValue === genericPlaceholderUrlString;
const isStillGenericPlaceholderKey = supabaseAnonKeyValue === genericPlaceholderKeyString;

if (isEmptyUrl || isEmptyKey || isStillGenericPlaceholderUrl || isStillGenericPlaceholderKey) {
  const errorLines = [
    'CRITICAL: Supabase client could not be initialized.',
    'Reason: Supabase URL or Anonymous Key is missing, empty, or still set to generic placeholder values after attempting to use environment variables and hardcoded defaults.',
    `  Resolved URL for client initialization: ${supabaseUrlValue || 'NOT SET / EMPTY'}`,
    `  Resolved Anon Key for client initialization: ${(isEmptyKey || isStillGenericPlaceholderKey) ? 'NOT SET / EMPTY / GENERIC PLACEHOLDER' : '******** (set but not displayed for security)'}`,
    '',
    'ACTION REQUIRED:',
    '1. Best Practice: Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables are correctly set with your actual Supabase project credentials.',
    '   These variables should be accessible in your application\'s environment.',
    '2. If environment variables are not being used, verify the hardcoded fallback values in `supabaseClient.ts` are correct and are not generic placeholders.',
    `   (The current hardcoded fallback URL is: ${hardcodedSupabaseUrl})`,
    `   (The current hardcoded fallback Key starts with: ${hardcodedSupabaseAnonKey.substring(0, 10)}...)`,
    '',
    'The application cannot proceed without valid Supabase credentials.'
  ];
  const errorMessageForConsole = errorLines.join('\n');
  console.error(errorMessageForConsole);
  
  throw new Error('Supabase configuration error. Please check the browser console for detailed instructions and correct your Supabase URL and Anon Key setup.'); 
}

// Define precise row structures for Supabase tables
type DebtorTableRow = {
  id: string;
  user_id?: string;
  name: string;
  totalamountowed: number; 
  amountpaid: number; 
  notes?: string;
  dateadded: string; 
  installmenttype: string; // Raw string from enum InstallmentType
  // monthlypaymentamount & paymentdayofmonth are for RECURRING
  monthlypaymentamount?: number; 
  paymentdayofmonth?: number; 
  // No numberofinstallments here - derived for FIXED from linked 'installments' table
};

type PaymentHistoryTableRow = {
  id: string;
  debtor_id: string;
  user_id: string;
  payment_date: string; 
  amount_paid: number;
  payment_method?: string;
  notes?: string;
  created_at: string;
  installment_id?: string; // FK to installments.id
  installment_sequence_number?: number; // For RECURRING
};

type InstallmentTableRow = {
  id: string;
  debtor_id: string;
  user_id: string;
  installment_number: number;
  due_date: string; // ISO Date string
  amount_due: number;
  amount_paid: number;
  status: string; // Raw string from enum InstallmentStatus
  // payment_ids are not directly stored as a column in this way usually.
  // This relationship is typically one (installment) to many (payments),
  // or a payment belongs to one installment.
  // So, payment_history.installment_id is the more common FK.
  // If an installment can be paid by multiple small payments, then PaymentRecord needs installment_id.
  created_at: string;
};

type AppSettingsTableRow = {
  config_name: string; // PK, e.g., 'global_logo_url'
  config_value: string; // URL or setting value
  updated_at?: string; // Timestamp of last update
};


export interface DatabasePrecise {
  public: {
    Tables: {
      debtors: {
        Row: DebtorTableRow;
        // Omitting id, dateadded, amountpaid as they are usually auto-generated or set by logic
        Insert: Omit<DebtorTableRow, 'id' | 'dateadded' | 'amountpaid'> & { id?: string; dateadded?: string; amountpaid?:number; }; 
        Update: Partial<DebtorTableRow>;
      };
      payment_history: {
        Row: PaymentHistoryTableRow;
        Insert: Omit<PaymentHistoryTableRow, 'id' | 'created_at' | 'payment_date'> & { id?: string; payment_date?: string; created_at?: string; };
        Update: Partial<Omit<PaymentHistoryTableRow, 'id' | 'debtor_id' | 'user_id' | 'created_at'>>;
      };
      installments: { // Nova tabela para parcelas
        Row: InstallmentTableRow;
        Insert: Omit<InstallmentTableRow, 'id' | 'created_at' | 'amount_paid' | 'status'> & { id?: string; created_at?: string; amount_paid?: number; status?: string; };
        Update: Partial<Omit<InstallmentTableRow, 'id' | 'debtor_id' | 'user_id' | 'created_at'>>;
      };
      app_settings: { // Tabela para configurações globais
        Row: AppSettingsTableRow;
        Insert: AppSettingsTableRow;
        Update: Partial<AppSettingsTableRow>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
}

export const supabase: SupabaseClient<DatabasePrecise> = createClient<DatabasePrecise>(supabaseUrlValue, supabaseAnonKeyValue);
