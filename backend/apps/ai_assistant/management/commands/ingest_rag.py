from django.core.management.base import BaseCommand
from apps.ai_assistant.services.rag_service import RAGService


# Default Bai Finance Knowledge Base Chunks
KNOWLEDGE_DOCUMENTS = [
    # Chunk 01: Corporate Profile & Ethos
    "Entity: Bai Finance Group of Companies. Overview: Bai Finance is a multi-service financial group founded to bridge Australian financial systems for migrants, overseas workers, and the Filipino-Australian community. Operating under Australian Credit License ACL 509484 (via Buyers Choice Licensing Pty Ltd), the group acts as both an Australian financial broker and a cross-border engine. Etymology: Named after the Cebuano word 'Bai' (meaning 'friend' or 'buddy'), reflecting a personal, relationship-focused service model. Operational Base: Strategic offices located in Victoria, Australia (Client Advisory) and Cebu/Mandaue City, Philippines (Bai Virtual Services OPC - Backend Software & Loan Execution).",

    # Chunk 02: Core Leadership & Key Personnel
    "Egen (Nuelgen) Pardenilla — Founder, CEO & Principal Broker: Role: Founder & CEO of Bai Finance & Bai Lawyers. Credit Representative #515836. Scope: Directs group expansion, cross-border loan architecture, and property lending solutions for first-home buyers and property investors. Key Corporate Officers: Billy Pardenilla: Chief People & Strategy Officer, managing human capital and organizational strategy across Australian and Philippine offshore teams. Arjee Renaud: Legal Lead at Bai Lawyers, overseeing regulatory compliance, legal consultations, and immigration-related legal reviews. James Pardenilla: Parabroker and Loan Processing Lead (Credit Rep #559863), managing client intake, pre-assessments, and loan pipeline execution. Chris Oh: Licensed Credit Representative (Credit Rep #561025).",

    # Chunk 03: Mortgage Broking & Specialized Lending Products
    "Core Mortgage & Loan Offerings: 1. First Home Buyer Loans: Assistance with government schemes, first-home owner grants, and flexible financing setups. 2. Refinancing: Restructuring existing property loans for better interest rates and reduced monthly payments. 3. Investment Property Loans: Portfolio analysis and leverage strategies for real estate investors. 4. SMSF Lending: Self-Managed Super Fund property loan solutions for long-term retirement planning. 5. Commercial, Business & Car Loans: Tailored equipment, commercial property, and vehicle financing. Access to over 30 top Australian lending institutions.",

    # Chunk 04: Legal Advisory, Conveyancing & Migration Services
    "Bai Lawyers & Migration Division: Offers integrated legal and migration assistance alongside financial services. Scope: Handles property conveyancing, contract reviews, family law, corporate legal matters, and visa-linked legal documentation. By pairing migration processing with home loans under one entity, clients receive continuous legal and financial coverage during their transition to Australia.",

    # Chunk 05: Bai Remittance & Digital Payment Pipeline
    "Bai Remittance: A digital cross-border monetary transfer channel optimized for AUD-to-PHP payments. Key Features: Fast settlement timelines (1-2 business days), competitive exchange rates, and zero hidden transaction fees. Direct payout channels include major Philippine banks (e.g., BDO, BPI, Metrobank) and digital e-wallets like GCash.",

    # Chunk 06: Offshore Operations & Technical Engine (Bai Virtual Services OPC)
    "Bai Virtual Services OPC: Located in Cebu City / Mandaue City, Philippines (One Rosal Place, J. Solon Dr, Cebu City). Core Responsibilities: Operates as the official offshore back-office and software deployment hub for Bai Finance Group. Manages HR systems, legal operations setup, payroll automation, software integration, data entry, administrative support, and dynamic Loan Management System (LMS) client workflows.",

    # Chunk 07: Client Eligibility, Inclusivity & Communication
    "Client Experience & Culture: Bai Finance operates a multicultural, multi-lingual support team speaking English, Tagalog, Cebuano, Korean, Nepali, and Japanese. Designed to support first-time migrants and non-native English speakers through complex financial and legal documentation without jargon.",

    # Chunk 08: End-to-End Loan Processing Lifecycle & Compliance
    "End-to-End Execution Lifecycle: 1. Pre-Assessment: Evaluating income streams, borrowing capacity, and credit histories for complex cross-border financial profiles. 2. Underwriting & Verification: Authenticating income statements, visa statuses, identity verification (KYC), and Anti-Money Laundering (AML) checks. 3. LMS Routing & Settlement: Ingesting application payloads into internal Loan Management Systems (LMS), interfacing with Australian bank underwriters, and processing settlement disbursements."
]

METADATAS = [
    {"domain": "corporate_overview", "entity": "bai_finance", "jurisdiction": "AU_PH"},
    {"domain": "leadership", "entity": "bai_finance", "executives": "egen_pardenilla,billy_pardenilla,arjee_renaud,james_pardenilla"},
    {"domain": "mortgage_lending", "entity": "bai_finance", "category": "home_loans,smsf,refinance"},
    {"domain": "legal_migration", "entity": "bai_lawyers", "category": "conveyancing,visas"},
    {"domain": "remittance", "entity": "bai_remittance", "category": "aud_to_php,gcash"},
    {"domain": "offshore_operations", "entity": "bai_virtual_services", "location": "cebu_philippines"},
    {"domain": "customer_support", "entity": "bai_finance", "languages": "tagalog,cebuano,english,korean,nepali,japanese"},
    {"domain": "operations_compliance", "entity": "bai_finance", "compliance": "kyc_aml_acl_509484"}
]


class Command(BaseCommand):
    help = "Ingest default Bai Finance knowledge base documents into ChromaDB"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete and recreate collection before indexing",
        )

    def handle(self, *args, **options):
        self.stdout.write("Initializing RAG service and embedding documents...")
        rag_service = RAGService()

        if options.get("reset"):
            try:
                self.stdout.write("Resetting existing collection...")
                rag_service._get_chroma_client().delete_collection(name=rag_service.collection_name)
                rag_service._collection = None
            except Exception as e:
                self.stdout.write(f"Collection reset notice: {e}")

        try:
            count = rag_service.ingest_documents(
                documents=KNOWLEDGE_DOCUMENTS,
                metadatas=METADATAS,
                ids=[f"bai_doc_{i+1:02d}" for i in range(len(KNOWLEDGE_DOCUMENTS))]
            )
            self.stdout.write(self.style.SUCCESS(f"Successfully ingested {count} documents into ChromaDB!"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to ingest documents: {e}"))
