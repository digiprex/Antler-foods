/**
 * Form Management Types
 * 
 * Types and interfaces for dynamic form creation and management
 */

// Form field types
export type FormFieldType = 
  | 'text' 
  | 'email' 
  | 'tel' 
  | 'textarea' 
  | 'select' 
  | 'radio' 
  | 'checkbox' 
  | 'number' 
  | 'date' 
  | 'file';

// Form field configuration
export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select, radio, checkbox fields
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  order: number;
}

// Main form interface
export interface Form {
  form_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  title: string;
  email: string;
  fields: FormField[];
  restaurant_id: string;
}

// Form creation/update payload
export interface FormPayload {
  title: string;
  email: string;
  fields: FormField[];
  restaurant_id: string;
}

// Form submission data
export interface FormSubmission {
  form_id: string;
  submission_data: Record<string, any>;
  submitted_at: string;
  ip_address?: string;
}

// API response types
export interface FormsResponse {
  success: boolean;
  data: Form[];
  error?: string;
}

export interface FormResponse {
  success: boolean;
  data: Form;
  error?: string;
}

export interface FormDeleteResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Form builder state
export interface FormBuilderState {
  title: string;
  email: string;
  fields: FormField[];
  draggedField?: FormField;
  selectedField?: FormField;
}

// Form validation result
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}