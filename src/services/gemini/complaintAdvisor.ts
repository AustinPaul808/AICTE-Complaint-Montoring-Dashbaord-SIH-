/**
 * AICTE AI Complaint Advisor
 * Uses Google Gemini to generate actionable investigation recommendations
 * for bureau officers when handling a complaint case.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

export interface ComplaintContext {
  complaint_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  bureau: string;
  institution_name: string;
  institution_state: string;
  complainant_type?: string | null;
  received_at: string;
  due_at?: string | null;
}

export interface AIRecommendation {
  summary: string;
  steps: string[];
  documents_needed: string[];
  escalation_flag: 'Low' | 'Medium' | 'High' | 'Critical';
  estimated_resolution_days: number;
  legal_provisions: string[];
  bureau_action: string;
}

const SYSTEM_PROMPT = `You are AICTE InspectorAI, an expert regulatory compliance advisor for the All India Council for Technical Education (AICTE), Government of India. 

Your role is to help AICTE bureau officers (RB, PGRC, AB, P&AP) understand how to initiate and execute the investigation of a complaint against a technical institution.

AICTE Bureaus:
- RB (Regulation Bureau): Faculty issues, unauthorized courses, admission irregularities
- PGRC (Public Grievance Redressal Cell): Fee violations, refunds, student harassment, certificate withholding
- AB (Approval Bureau): Infrastructure compliance, lab non-compliance
- P&AP (Policy & Academic Planning): Governance, administrative malpractice

When given a complaint, respond ONLY with a valid JSON object matching this schema:
{
  "summary": "1-2 sentence executive overview of what this complaint is about and its regulatory significance",
  "steps": ["Step 1: ...", "Step 2: ...", ...],  // 4-6 concrete numbered action steps the officer must take
  "documents_needed": ["Document 1", "Document 2", ...],  // 3-5 specific documents to collect as evidence
  "escalation_flag": "Low" | "Medium" | "High" | "Critical",
  "estimated_resolution_days": <number>,
  "legal_provisions": ["AICTE Act Section X", ...],  // 2-3 applicable AICTE regulations or acts
  "bureau_action": "One clear sentence on the primary action this bureau must take"
}

Be specific, practical, and use AICTE regulatory language. Do not add any text outside the JSON.`;

export async function getComplaintRecommendations(
  ctx: ComplaintContext
): Promise<AIRecommendation> {
  if (!apiKey || apiKey === 'undefined') {
    throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const daysSinceReceived = Math.floor(
    (Date.now() - new Date(ctx.received_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const prompt = `Analyze this AICTE complaint and provide investigation recommendations:

COMPLAINT REFERENCE: ${ctx.complaint_number}
TITLE: ${ctx.title}
CATEGORY: ${ctx.category}
PRIORITY: ${ctx.priority}
CURRENT STATUS: ${ctx.status}
RESPONSIBLE BUREAU: ${ctx.bureau}
INSTITUTION: ${ctx.institution_name} (${ctx.institution_state})
COMPLAINANT TYPE: ${ctx.complainant_type || 'Public / Unspecified'}
DAYS SINCE RECEIPT: ${daysSinceReceived} days
RESOLUTION DEADLINE: ${ctx.due_at ? new Date(ctx.due_at).toLocaleDateString('en-IN') : 'No deadline set'}

COMPLAINT DESCRIPTION:
${ctx.description}

Provide a structured JSON response with actionable steps for the ${ctx.bureau} officer to begin executing this complaint.`;

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: prompt },
  ]);

  const text = result.response.text().trim();

  // Strip markdown code fences if Gemini wraps the JSON
  const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(jsonStr) as AIRecommendation;
    return parsed;
  } catch {
    throw new Error('AI returned an unstructured response. Please try again.');
  }
}
