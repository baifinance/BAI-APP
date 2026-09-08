/**
 * ==============================================================================
 * FILE: MockData.ts
 * Path: src/app/broker/components/MockData.ts
 * Description: Expanded Static Mock Data & Type Definitions for the Broker Portal.
 * ==============================================================================
 */

export interface ClientProfile {
  fullLegalName: string;
  dob: string;
  placeOfBirth: string;
  nationality: string;
  civilStatus: "Single" | "Married" | "De Facto" | "Divorced" | "Widowed";
  numberOfDependents: number;
  residentialAddress: string;
  address: string;
  previousAddress: string;
  mobile: string;
  email: string;
  idType: string;
  idNumber: string;
}

export interface ClientLoan {
  loanType: string;
  requestedAmount: number;
  purpose: string;
  preferredTerm: number; // in years
  preferredMonthlyPayment: number;
  urgency: "Low" | "Medium" | "High" | "Critical";
}

export interface ClientEmployment {
  status: "Full-Time" | "Part-Time" | "Self-Employed" | "Contractor" | "Unemployed";
  employerBusiness: string;
  position: string;
  yearsEmployed: number;
  monthlyGrossIncome: number;
  monthlyNetIncome: number;
  otherIncome: number;
}

export interface LiabilityItem {
  liabilityType: string;
  creditor: string;
  outstandingBalance: number;
  monthlyPayment: number;
  interestRate: string;
  loanTerm: string;
  remainingTerm: string;
  paymentStatus: "Current" | "Pending" | "Overdue";
}

export interface ClientObligations {
  hasExistingLoans: "Yes" | "No";
  existingLoanAmount: number;
  monthlyDebtPayments: number;
  numExistingLoans: number;
  items?: LiabilityItem[];
}

export interface ClientCollateral {
  hasCollateral: "Yes" | "No";
  collateralType: string;
  description?: string;
  estimatedValue: number;
  appraisedValue?: number;
  location?: string;
  ownership: string;
  condition?: string;
  existingMortgage: string;
  requiredDocuments?: string[];
}

export interface ClientDocuments {
  governmentId: "Uploaded" | "Verified" | "Pending" | "Not Uploaded";
  proofOfIncome: "Uploaded" | "Verified" | "Pending" | "Not Uploaded";
  bankStatement: "Uploaded" | "Verified" | "Pending" | "Not Uploaded";
  taxDocuments: "Uploaded" | "Verified" | "Pending" | "Not Uploaded";
  employmentDocs: "Uploaded" | "Verified" | "Pending" | "Not Uploaded";
  businessDocs: "Uploaded" | "Verified" | "Pending" | "Not Uploaded" | "Not Required";
  collateralDocs: "Uploaded" | "Verified" | "Pending" | "Not Uploaded" | "Not Required";
  otherDocs: "Uploaded" | "Verified" | "Pending" | "Not Uploaded" | "Not Required";
}

export interface ClientBrokerDetails {
  assignedBroker: string;
  applicationStatus: "Submitted" | "In review" | "Requested" | "Settled" | "Declined" | "Approved";
  brokerNotes: string;
  lenderMatches: string[];
  submittedLenders: string[];
  approvalStatus: "Pre-Approved" | "Conditionally Approved" | "Fully Approved" | "Declined" | "Pending Assessment";
  commission: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  applicationType: string;
  amount: number;
  documentState: "Submitted" | "In review" | "Requested" | "Settled" | "Declined" | "Approved";
  lastActivity: string;
  dateStarted: string; // YYYY-MM-DD
  progress: number; // Client progress percentage 0-100
  notes?: string;
  
  // Expanded Deep-Dive Details
  profile: ClientProfile;
  loan: ClientLoan;
  employment: ClientEmployment;
  obligations: ClientObligations;
  collateral: ClientCollateral;
  documents: ClientDocuments;
  brokerDetails: ClientBrokerDetails;
}

export interface Application {
  id: string;
  clientName: string;
  clientId: string;
  type: string;
  amount: number;
  progress: number;
  status: "Submitted" | "In review" | "Action needed" | "Approved" | "Settled" | "Declined";
  dateCreated: string;
  lender: string;
  details: string;
}

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  brokerName?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  type: string;
  platform: string;
  notes?: string;
}

export interface Email {
  id: string;
  clientId: string;
  clientName: string;
  subject: string;
  body: string;
  dateSent: string;
  status: "Sent" | "Delivered";
}

// ------------------------------------------------------------------------------
// STATIC CLIENT DATA (Detailed profile information)
// ------------------------------------------------------------------------------
export const initialClients: Client[] = [
  {
    id: "c2",
    name: "Alice Smith",
    email: "alice.smith@email.com",
    phone: "+61 498 765 432",
    applicationType: "Refinance Loan",
    amount: 480000,
    documentState: "In review",
    lastActivity: "2026-08-24",
    dateStarted: "2026-08-24", // Today
    progress: 80,
    notes: "Reviewing tax returns for self-employed income.",
    profile: {
      fullLegalName: "Alice Jane Smith",
      dob: "1988-11-12",
      placeOfBirth: "Sydney, Australia",
      nationality: "Australian",
      civilStatus: "Married",
      numberOfDependents: 2,
      residentialAddress: "24 Alfred St, Milsons Point NSW 2061, Australia",
      address: "24 Alfred St, Milsons Point NSW 2061, Australia",
      previousAddress: "15 Ocean St, Manly NSW 2095, Australia (2018 - 2023)",
      mobile: "+61 498 765 432",
      email: "alice.smith@email.com",
      idType: "Driver License",
      idNumber: "DL-9988776"
    },
    loan: {
      loanType: "Refinance Loan",
      requestedAmount: 480000,
      purpose: "Owner occupier refinance to secure lower interest rate and pay down principal faster.",
      preferredTerm: 25,
      preferredMonthlyPayment: 2600,
      urgency: "High"
    },
    employment: {
      status: "Self-Employed",
      employerBusiness: "A&S Design Studio Pty Ltd",
      position: "Creative Director / Owner",
      yearsEmployed: 6,
      monthlyGrossIncome: 14000,
      monthlyNetIncome: 10500,
      otherIncome: 1200
    },
    obligations: {
      hasExistingLoans: "Yes",
      existingLoanAmount: 510000,
      monthlyDebtPayments: 3100,
      numExistingLoans: 1
    },
    collateral: {
      hasCollateral: "Yes",
      collateralType: "Residential Property",
      estimatedValue: 750000,
      ownership: "Sole Owner",
      existingMortgage: "Yes - Westpac"
    },
    documents: {
      governmentId: "Verified",
      proofOfIncome: "Uploaded",
      bankStatement: "Verified",
      taxDocuments: "Pending",
      employmentDocs: "Verified",
      businessDocs: "Uploaded",
      collateralDocs: "Verified",
      otherDocs: "Not Required"
    },
    brokerDetails: {
      assignedBroker: "Sarah Jenkins",
      applicationStatus: "In review",
      brokerNotes: "Client refinance has strong equity buffer (LVR ~64%). Awaiting final 2026 corporate tax returns matching portal declarations.",
      lenderMatches: ["BAI Finance", "Commonwealth Bank", "Macquarie Bank"],
      submittedLenders: ["Commonwealth Bank"],
      approvalStatus: "Pending Assessment",
      commission: "1.10% (Est. A$ 5,280)"
    }
  },
  {
    id: "c1",
    name: "John Doe",
    email: "john.doe@email.com",
    phone: "+61 412 345 678",
    applicationType: "First Home Buyer Loan",
    amount: 650000,
    documentState: "Approved",
    lastActivity: "2026-08-23",
    dateStarted: "2026-08-23", // This Week
    progress: 100,
    notes: "Requires LMI waiver review.",
    profile: {
      fullLegalName: "John Alexander Doe",
      dob: "1994-04-15",
      placeOfBirth: "Melbourne, Australia",
      nationality: "Australian",
      civilStatus: "Single",
      numberOfDependents: 0,
      residentialAddress: "102/45 Glen St, Glen Waverley VIC 3150, Australia",
      address: "102/45 Glen St, Glen Waverley VIC 3150, Australia",
      previousAddress: "88 Station Rd, Box Hill VIC 3128, Australia (2020 - 2024)",
      mobile: "+61 412 345 678",
      email: "john.doe@email.com",
      idType: "Passport",
      idNumber: "N-4422551"
    },
    loan: {
      loanType: "First Home Buyer Loan",
      requestedAmount: 650000,
      purpose: "Purchase of a new-build residential townhouse in Melbourne southeast.",
      preferredTerm: 30,
      preferredMonthlyPayment: 3900,
      urgency: "Medium"
    },
    employment: {
      status: "Full-Time",
      employerBusiness: "TechCorp Solutions Pty Ltd",
      position: "Senior Software Engineer",
      yearsEmployed: 3.5,
      monthlyGrossIncome: 12500,
      monthlyNetIncome: 9200,
      otherIncome: 0
    },
    obligations: {
      hasExistingLoans: "No",
      existingLoanAmount: 0,
      monthlyDebtPayments: 0,
      numExistingLoans: 0
    },
    collateral: {
      hasCollateral: "Yes",
      collateralType: "Residential Land & Dwelling",
      estimatedValue: 710000,
      ownership: "Purchaser",
      existingMortgage: "No"
    },
    documents: {
      governmentId: "Verified",
      proofOfIncome: "Verified",
      bankStatement: "Verified",
      taxDocuments: "Verified",
      employmentDocs: "Verified",
      businessDocs: "Not Required",
      collateralDocs: "Verified",
      otherDocs: "Verified"
    },
    brokerDetails: {
      assignedBroker: "Sarah Jenkins",
      applicationStatus: "Approved",
      brokerNotes: "Client qualifies for the First Home Buyer Scheme, exempting Stamp Duty. LMI waiver approved under the Corporate Professional Package.",
      lenderMatches: ["BAI Finance", "ANZ Bank", "NAB"],
      submittedLenders: ["BAI Finance"],
      approvalStatus: "Fully Approved",
      commission: "1.25% (Est. A$ 8,125)"
    }
  },
  {
    id: "c3",
    name: "Michael Brown",
    email: "michael.b@email.com",
    phone: "+61 422 555 111",
    applicationType: "Investment Property Loan",
    amount: 820000,
    documentState: "Submitted",
    lastActivity: "2026-08-22",
    dateStarted: "2026-08-22", // This Week
    progress: 95,
    notes: "Pre-approval sought for Sydney inner west property.",
    profile: {
      fullLegalName: "Michael Edward Brown",
      dob: "1979-08-30",
      placeOfBirth: "Brisbane, Australia",
      nationality: "Australian",
      civilStatus: "Married",
      numberOfDependents: 3,
      residentialAddress: "18 Belmont Rd, Mosman NSW 2088, Australia",
      address: "18 Belmont Rd, Mosman NSW 2088, Australia",
      previousAddress: "5 Military Rd, Neutral Bay NSW 2089, Australia (2015 - 2021)",
      mobile: "+61 422 555 111",
      email: "michael.b@email.com",
      idType: "Driver License",
      idNumber: "DL-1122334"
    },
    loan: {
      loanType: "Investment Property Loan",
      requestedAmount: 820000,
      purpose: "Buying an investment apartment in Balmain with strong rental yield potential.",
      preferredTerm: 30,
      preferredMonthlyPayment: 4800,
      urgency: "Medium"
    },
    employment: {
      status: "Full-Time",
      employerBusiness: "Apex Wealth Management Ltd",
      position: "Investment Consultant",
      yearsEmployed: 8,
      monthlyGrossIncome: 18000,
      monthlyNetIncome: 12500,
      otherIncome: 3500
    },
    obligations: {
      hasExistingLoans: "Yes",
      existingLoanAmount: 1200000,
      monthlyDebtPayments: 7200,
      numExistingLoans: 2
    },
    collateral: {
      hasCollateral: "Yes",
      collateralType: "Residential Property (Equity Release)",
      estimatedValue: 2400000,
      ownership: "Joint Ownership",
      existingMortgage: "Yes - ANZ"
    },
    documents: {
      governmentId: "Verified",
      proofOfIncome: "Verified",
      bankStatement: "Verified",
      taxDocuments: "Verified",
      employmentDocs: "Verified",
      businessDocs: "Not Required",
      collateralDocs: "Verified",
      otherDocs: "Uploaded"
    },
    brokerDetails: {
      assignedBroker: "Sarah Jenkins",
      applicationStatus: "Submitted",
      brokerNotes: "LVR rests at 80% with cross-collateralization. Strong surplus income supported by rental yields projections and share dividends.",
      lenderMatches: ["BAI Finance", "Macquarie Bank", "St. George"],
      submittedLenders: ["Macquarie Bank"],
      approvalStatus: "Pending Assessment",
      commission: "1.00% (Est. A$ 8,200)"
    }
  },
  {
    id: "c4",
    name: "Emma Wilson",
    email: "emma.w@email.com",
    phone: "+63 917 123 4567",
    applicationType: "Construction Loan",
    amount: 350000,
    documentState: "Requested",
    lastActivity: "2026-08-20",
    dateStarted: "2026-08-20", // This Week
    progress: 40,
    notes: "Awaiting final builder contract and specs.",
    profile: {
      fullLegalName: "Emma Rose Wilson",
      dob: "1991-05-22",
      placeOfBirth: "Manila, Philippines",
      nationality: "Filipino",
      civilStatus: "Single",
      numberOfDependents: 0,
      residentialAddress: "Block 15 Lot 4, Park Place, Alabang, Muntinlupa, Philippines",
      address: "Block 15 Lot 4, Park Place, Alabang, Muntinlupa, Philippines",
      previousAddress: "Unit 402, Sunset Towers, Makati City, Philippines (2020 - 2024)",
      mobile: "+63 917 123 4567",
      email: "emma.w@email.com",
      idType: "UMID ID",
      idNumber: "UMID-88771"
    },
    loan: {
      loanType: "Construction Loan",
      requestedAmount: 350000,
      purpose: "Constructing a modern 4-bedroom villa on a pre-owned block in Cavite.",
      preferredTerm: 20,
      preferredMonthlyPayment: 2900,
      urgency: "Critical"
    },
    employment: {
      status: "Full-Time",
      employerBusiness: "Outsource Global Solutions",
      position: "Operations Director",
      yearsEmployed: 4,
      monthlyGrossIncome: 8000,
      monthlyNetIncome: 6200,
      otherIncome: 0
    },
    obligations: {
      hasExistingLoans: "Yes",
      existingLoanAmount: 37000,
      monthlyDebtPayments: 850,
      numExistingLoans: 2,
      items: [
        {
          liabilityType: "Personal Vehicle Loan",
          creditor: "BDO Unibank / Auto Finance",
          outstandingBalance: 22000,
          monthlyPayment: 450,
          interestRate: "6.25% p.a.",
          loanTerm: "5 Years",
          remainingTerm: "2 Years 4 Months",
          paymentStatus: "Current"
        },
        {
          liabilityType: "Revolving Credit Card Line",
          creditor: "BPI Commercial Bank",
          outstandingBalance: 15000,
          monthlyPayment: 400,
          interestRate: "18.50% p.a.",
          loanTerm: "Revolving",
          remainingTerm: "Ongoing",
          paymentStatus: "Current"
        }
      ]
    },
    collateral: {
      hasCollateral: "Yes",
      collateralType: "Residential Land & Dwelling Lot",
      description: "4-Bedroom Modern Architectural Villa Lot located in Prime Alabang Estate with gated security.",
      estimatedValue: 350000,
      appraisedValue: 340000,
      location: "Block 15 Lot 4, Park Place, Alabang, Muntinlupa, Philippines",
      ownership: "Sole Owner",
      condition: "Excellent - Pre-Construction / Cleared Land Lot",
      existingMortgage: "No Encumbrance",
      requiredDocuments: [
        "Original Transfer Certificate of Title (TCT)",
        "Property Tax Declaration & Tax Clearance Receipt",
        "Certified Bureau of Lands Lot Plan & Vicinity Map",
        "Certified Real Estate Appraisal Report",
        "Comprehensive Property & Fire Insurance Policy"
      ]
    },
    documents: {
      governmentId: "Verified",
      proofOfIncome: "Uploaded",
      bankStatement: "Pending",
      taxDocuments: "Not Uploaded",
      employmentDocs: "Uploaded",
      businessDocs: "Not Required",
      collateralDocs: "Verified",
      otherDocs: "Pending"
    },
    brokerDetails: {
      assignedBroker: "Sarah Jenkins",
      applicationStatus: "Requested",
      brokerNotes: "Builder's blueprint plans, costing, contract, and warranty specs remain outstanding. Client notified via portal alert.",
      lenderMatches: ["BAI Finance Ltd", "BDO", "BPI"],
      submittedLenders: [],
      approvalStatus: "Pending Assessment",
      commission: "1.50% (Est. A$ 5,250)"
    }
  },
  {
    id: "c6",
    name: "Sophia Martinez",
    email: "sophia.m@email.com",
    phone: "+63 928 888 7777",
    applicationType: "Land Only Loan",
    amount: 280000,
    documentState: "Declined",
    lastActivity: "2026-08-18",
    dateStarted: "2026-08-10", // This Month
    progress: 75,
    notes: "LTV exceeded maximum allowed for land loans.",
    profile: {
      fullLegalName: "Sophia Maria Martinez",
      dob: "1983-02-18",
      placeOfBirth: "Cebu City, Philippines",
      nationality: "Filipino",
      civilStatus: "Married",
      numberOfDependents: 1,
      residentialAddress: "12 Jasmine Rd, Dasmarinas Village, Makati, Philippines",
      address: "12 Jasmine Rd, Dasmarinas Village, Makati, Philippines",
      previousAddress: "45 Acacia Ave, Ayala Alabang, Muntinlupa, Philippines (2016 - 2022)",
      mobile: "+63 928 888 7777",
      email: "sophia.m@email.com",
      idType: "Passport",
      idNumber: "P-880091"
    },
    loan: {
      loanType: "Land Only Loan",
      requestedAmount: 280000,
      purpose: "Purchasing a high-value agricultural parcel in Tagaytay for future development.",
      preferredTerm: 15,
      preferredMonthlyPayment: 2500,
      urgency: "Low"
    },
    employment: {
      status: "Full-Time",
      employerBusiness: "Global Hospitality Partners",
      position: "VP Operations",
      yearsEmployed: 9,
      monthlyGrossIncome: 11000,
      monthlyNetIncome: 8500,
      otherIncome: 1500
    },
    obligations: {
      hasExistingLoans: "Yes",
      existingLoanAmount: 400000,
      monthlyDebtPayments: 2900,
      numExistingLoans: 1
    },
    collateral: {
      hasCollateral: "Yes",
      collateralType: "Residential Condo (Makati)",
      estimatedValue: 350000,
      ownership: "Sole Owner",
      existingMortgage: "No"
    },
    documents: {
      governmentId: "Verified",
      proofOfIncome: "Verified",
      bankStatement: "Uploaded",
      taxDocuments: "Verified",
      employmentDocs: "Verified",
      businessDocs: "Not Required",
      collateralDocs: "Pending",
      otherDocs: "Not Uploaded"
    },
    brokerDetails: {
      assignedBroker: "Sarah Jenkins",
      applicationStatus: "Declined",
      brokerNotes: "Application declined due to high LTV limits (85%) on vacant agricultural land. Client advised to increase deposit or offer additional security.",
      lenderMatches: ["BDO", "Security Bank"],
      submittedLenders: ["BDO"],
      approvalStatus: "Declined",
      commission: "0.00% (Declined)"
    }
  },
  {
    id: "c5",
    name: "David Lee",
    email: "david.lee@email.com",
    phone: "+61 433 999 888",
    applicationType: "First Home Buyer Loan",
    amount: 520000,
    documentState: "Settled",
    lastActivity: "2026-08-15",
    dateStarted: "2026-07-15", // This Year
    progress: 100,
    notes: "Settled successfully. Sent congrats email.",
    profile: {
      fullLegalName: "David Christian Lee",
      dob: "1990-09-05",
      placeOfBirth: "Perth, Australia",
      nationality: "Australian",
      civilStatus: "Married",
      numberOfDependents: 1,
      residentialAddress: "56 Station Rd, Indooroopilly QLD 4068, Australia",
      address: "56 Station Rd, Indooroopilly QLD 4068, Australia",
      previousAddress: "12 Riverview Tce, Toowong QLD 4066, Australia (2019 - 2023)",
      mobile: "+61 433 999 888",
      email: "david.lee@email.com",
      idType: "Driver License",
      idNumber: "DL-8855221"
    },
    loan: {
      loanType: "First Home Buyer Loan",
      requestedAmount: 520000,
      purpose: "Buying first residential home (established apartment) in Brisbane suburbs.",
      preferredTerm: 30,
      preferredMonthlyPayment: 2900,
      urgency: "Low"
    },
    employment: {
      status: "Full-Time",
      employerBusiness: "Brisbane City Health Services",
      position: "Associate Nurse Unit Manager",
      yearsEmployed: 5,
      monthlyGrossIncome: 9500,
      monthlyNetIncome: 7100,
      otherIncome: 0
    },
    obligations: {
      hasExistingLoans: "No",
      existingLoanAmount: 0,
      monthlyDebtPayments: 0,
      numExistingLoans: 0
    },
    collateral: {
      hasCollateral: "Yes",
      collateralType: "Residential Apartment",
      estimatedValue: 580000,
      ownership: "Joint Ownership",
      existingMortgage: "No"
    },
    documents: {
      governmentId: "Verified",
      proofOfIncome: "Verified",
      bankStatement: "Verified",
      taxDocuments: "Verified",
      employmentDocs: "Verified",
      businessDocs: "Not Required",
      collateralDocs: "Verified",
      otherDocs: "Verified"
    },
    brokerDetails: {
      assignedBroker: "Sarah Jenkins",
      applicationStatus: "Settled",
      brokerNotes: "Successfully settled on schedule. Commission processed.",
      lenderMatches: ["Suncorp Bank", "ANZ Bank", "BAI Finance"],
      submittedLenders: ["Suncorp Bank"],
      approvalStatus: "Fully Approved",
      commission: "1.25% (Est. A$ 6,500)"
    }
  },
  {
    id: "c6_2",
    name: "Michael Chang",
    email: "michael.chang@email.com",
    phone: "+61 412 345 678",
    applicationType: "Investment Property Loan",
    amount: 620000,
    documentState: "Approved",
    lastActivity: "2026-08-24",
    dateStarted: "2026-08-24",
    progress: 95,
    notes: "Awaiting final title search from solicitor.",
    profile: {
      fullLegalName: "Michael David Chang",
      dob: "1983-05-18",
      placeOfBirth: "Adelaide, Australia",
      nationality: "Australian",
      civilStatus: "Single",
      numberOfDependents: 0,
      residentialAddress: "12/88 Broadway, Ultimo NSW 2007, Australia",
      address: "12/88 Broadway, Ultimo NSW 2007, Australia",
      previousAddress: "34 George St, Haymarket NSW 2000, Australia (2017 - 2022)",
      mobile: "+61 412 345 678",
      email: "michael.chang@email.com",
      idType: "Passport",
      idNumber: "PA-9988776"
    },
    loan: {
      loanType: "Investment Loan",
      requestedAmount: 620000,
      purpose: "Purchasing off-the-plan apartment for rental yield.",
      preferredTerm: 25,
      preferredMonthlyPayment: 3800,
      urgency: "Medium"
    },
    employment: {
      status: "Full-Time",
      employerBusiness: "Atlassian Australia",
      position: "Senior Software Engineer",
      yearsEmployed: 4,
      monthlyGrossIncome: 14500,
      monthlyNetIncome: 10500,
      otherIncome: 1200
    },
    obligations: {
      hasExistingLoans: "Yes",
      existingLoanAmount: 320000,
      monthlyDebtPayments: 1800,
      numExistingLoans: 1
    },
    collateral: {
      hasCollateral: "Yes",
      collateralType: "Residential Apartment",
      estimatedValue: 780000,
      ownership: "Sole Ownership",
      existingMortgage: "Yes"
    },
    documents: {
      governmentId: "Verified",
      proofOfIncome: "Verified",
      bankStatement: "Verified",
      taxDocuments: "Verified",
      employmentDocs: "Verified",
      businessDocs: "Not Required",
      collateralDocs: "Verified",
      otherDocs: "Not Required"
    },
    brokerDetails: {
      assignedBroker: "Sarah Jenkins",
      applicationStatus: "Approved",
      brokerNotes: "Unconditional approval received. LVR is comfortable at 79%. Ready for exchange.",
      lenderMatches: ["Macquarie Bank", "Westpac", "BAI Finance"],
      submittedLenders: ["Macquarie Bank"],
      approvalStatus: "Fully Approved",
      commission: "1.10% (Est. A$ 6,820)"
    }
  }
];

// ------------------------------------------------------------------------------
// STATIC APPLICATION DATA (Stats matching screenshot 2)
// ------------------------------------------------------------------------------
export const initialApplications: Application[] = [
  {
    id: "BAI-2026-0148",
    clientId: "c4",
    clientName: "Emma Wilson",
    type: "Construction Loan",
    amount: 350000,
    progress: 40,
    status: "Action needed",
    dateCreated: "2026-08-20",
    lender: "BAI Finance Ltd",
    details: "Additional Info Requested: Signed builder's contract and builder's warranty insurance details are outstanding."
  },
  {
    id: "BAI-2026-0149",
    clientId: "c2",
    clientName: "Alice Smith",
    type: "Refinance Loan",
    amount: 480000,
    progress: 80,
    status: "In review",
    dateCreated: "2026-08-24",
    lender: "Commonwealth Bank",
    details: "Underwriter is currently reviewing the tax portals and self-employment worksheets."
  },
  {
    id: "BAI-2026-0150",
    clientId: "c3",
    clientName: "Michael Brown",
    type: "Investment Property Loan",
    amount: 820000,
    progress: 95,
    status: "Submitted",
    dateCreated: "2026-08-22",
    lender: "Macquarie Bank",
    details: "All documents submitted and queued for assessment."
  }
];

// ------------------------------------------------------------------------------
// STATIC BOOKINGS DATA
// ------------------------------------------------------------------------------
export const initialBookings: Booking[] = [
  {
    id: "b1",
    clientId: "c2",
    clientName: "Alice Smith",
    date: "2026-08-25", // Tomorrow relative to current local time of 2026-08-24
    time: "10:00 AM",
    type: "Document Clarification Meeting",
    platform: "Zoom Video Call",
    notes: "Review self-employed tax details and clarify interest expense discrepancies."
  },
  {
    id: "b2",
    clientId: "c3",
    clientName: "Michael Brown",
    date: "2026-08-27",
    time: "02:00 PM",
    type: "Strategy Consultation",
    platform: "Google Meet",
    notes: "Discuss investment property portfolio and LVR calculations."
  },
  {
    id: "b3",
    clientId: "c5",
    clientName: "David Lee",
    date: "2026-08-28",
    time: "11:00 AM",
    type: "Post-Settlement Catch-up",
    platform: "Phone Call",
    notes: "Review settlement check details and secure client feedback."
  }
];

// ------------------------------------------------------------------------------
// STATIC EMAIL DATA
// ------------------------------------------------------------------------------
export const initialEmails: Email[] = [
  {
    id: "e1",
    clientId: "c2",
    clientName: "Alice Smith",
    subject: "Tax documents review complete",
    body: "Hi Alice,\n\nI've gone through the tax returns you sent over and they look perfect. I've updated your status to 'In review' and submitted them to the underwriters. I'll let you know if they raise any queries.\n\nBest regards,\nSarah Jenkins\nSenior Mortgage Broker, BAI Finance",
    dateSent: "2026-08-24 09:30 AM",
    status: "Delivered"
  },
  {
    id: "e2",
    clientId: "c4",
    clientName: "Emma Wilson",
    subject: "Outstanding Builder's Contract Required",
    body: "Hi Emma,\n\nTo move forward with your construction loan application, the lender requires the final signed builder's contract and proof of builder's warranty insurance. Please upload these files through your secure portal as soon as possible.\n\nThanks,\nSarah Jenkins\nSenior Mortgage Broker, BAI Finance",
    dateSent: "2026-08-23 02:15 PM",
    status: "Delivered"
  },
  {
    id: "e3",
    clientId: "c1",
    clientName: "John Doe",
    subject: "Conditional Approval Secured - #BAI-2026-0140",
    body: "Great news John!\n\nWe have received the conditional approval from the lender for your $650,000 home loan. The remaining conditions are valuation of the property and verification of your final bank statements. We will arrange the valuation shortly.\n\nWarm regards,\nSarah Jenkins\nSenior Mortgage Broker, BAI Finance",
    dateSent: "2026-08-21 11:00 AM",
    status: "Delivered"
  }
];
