# Future AI-Powered Overlapping Complaint Detection Engine

> **Status:** Deliberately Deferred (Future Implementation Phase)  
> **Notice:** Per Section 7 of the Project Requirements Document (SIH Problem Statement ID: 26264), no AI matching logic, embedding models, vector search, or mock detection algorithms are implemented during this phase.

---

## 1. Purpose of the Future Engine
In multi-departmental governance environments like AICTE, multiple bureaus (such as Regulation Bureau [RB], Public Grievance Redressal Cell [PGRC], Approval Bureau [AB], and Policy Bureau) frequently receive complaints relating to the same institution or underlying dispute.

Without automated semantic matching, officers across bureaus investigate duplicate or overlapping issues independently, resulting in:
- Redundant investigation efforts.
- Inconsistent regulatory orders or administrative findings.
- Fragmented institutional compliance histories.

The future Overlap Engine will automate the discovery of semantically related and duplicate complaints across bureau boundaries.

---

## 2. Planned Inputs
The engine will consume standardized complaint records stored in the primary Supabase PostgreSQL database:
- `institutions.aicte_permanent_id` and `institutions.id`: Exact and fuzzy institutional matching.
- `complaints.category`: Complaint domain categorization (e.g., faculty deficiency, fee caps, infrastructure).
- `complaints.title` and `complaints.description`: Unstructured textual grievances.
- `complaints.received_at`: Temporal proximity windows.
- Supporting documents and attachment metadata.

---

## 3. Planned Outputs
When integrated, the engine will compute and output:
- **Ranked Candidate Matches**: A list of existing complaints with similarity confidence scores ($0.00$ to $1.00$).
- **Overlap Rationale**: Highlighting shared entities (same institution, same complainant, identical regulatory clauses).
- **Cross-Bureau Review Flag**: Notifications to designated officers alerting them that a related case is under active investigation in another bureau.

---

## 4. Planned Architecture & Integration
- **Database Layer**: PostgreSQL `pgvector` extension for storing and indexing text embeddings.
- **Embedding Pipeline**: Asynchronous background workers generating vector embeddings for incoming complaints without blocking standard complaint submission.
- **Review Workflow**: A human-in-the-loop review interface allowing authorized bureau officers to confirm, link, or dismiss suggested overlaps.

---

## 5. Current Phase Development Restriction
Implementation of the Overlap Engine is strictly excluded from Phase 1-5 development:
- **No** embedding generation or machine learning models.
- **No** similarity scoring algorithms or vector search extensions.
- **No** fake/mock services pretending to compute duplicate clusters.
- **No** database tables created purely for speculative overlap storage.

The AICTE Cross-Bureau Complaint Coordination Platform remains fully operational, authoritative, and secure using standard relational workflows in Supabase.
