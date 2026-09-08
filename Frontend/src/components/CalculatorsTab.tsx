/**
 * ==============================================================================
 * COMPONENT: CalculatorsTab.tsx
 * Path: src/app/broker/components/CalculatorsTab.tsx
 * Description: Interactive financial calculators (Repayments, Borrowing Power,
 *              Interest Only) styled premium, matching screenshot 3.
 * ==============================================================================
 */

import React, { useState, useEffect } from "react";
import { Calculator, DollarSign, Calendar, Info } from "lucide-react";

type CalcTab = "Repayments" | "Borrowing" | "InterestOnly";

interface CalculatorsTabProps {
  variant?: "broker" | "loan_processing" | "client";
}

export default function CalculatorsTab({ variant }: CalculatorsTabProps = {}) {
  // Theme variants configuration
  const isLoanProcessing = variant === "loan_processing";
  const isClient = variant === "client";
  const primaryText = isClient ? "text-[#0024A8]" : isLoanProcessing ? "text-[#1429A9]" : "text-[#0B2369]";
  const primaryBg = isClient ? "bg-[#0024A8] hover:bg-[#001D85]" : isLoanProcessing ? "bg-[#1429A9] hover:bg-[#10218A]" : "bg-[#0B2369] hover:bg-[#071644]";
  const shadowBg = isClient ? "shadow-[#0024A8]/10" : isLoanProcessing ? "shadow-[#1429A9]/10" : "shadow-[#0B2369]/10";

  const [activeTab, setActiveTab] = useState<CalcTab>("Repayments");

  // ------------------------------------------------------------------------------
  // CALCULATOR 1: LOAN REPAYMENTS STATE
  // ------------------------------------------------------------------------------
  const [loanAmount, setLoanAmount] = useState(500000);
  const [interestRate, setInterestRate] = useState(6.0);
  const [loanTerm, setLoanTerm] = useState(30);
  const [firstPaymentDate, setFirstPaymentDate] = useState("2026-09-01"); // date input as per request

  // Outputs
  const [monthlyRepayment, setMonthlyRepayment] = useState(0);
  const [totalInterestPaid, setTotalInterestPaid] = useState(0);
  const [totalCostOfLoan, setTotalCostOfLoan] = useState(0);

  // ------------------------------------------------------------------------------
  // CALCULATOR 2: BORROWING POWER STATE
  // ------------------------------------------------------------------------------
  const [annualIncome, setAnnualIncome] = useState(120000);
  const [otherIncome, setOtherIncome] = useState(10000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(2500);
  const [monthlyLoans, setMonthlyLoans] = useState(500);
  const [creditCardLimit, setCreditCardLimit] = useState(10000);
  const [dependents, setDependents] = useState(0);
  const [borrowInterestRate, setBorrowInterestRate] = useState(6.0);
  const [borrowFirstPaymentDate, setBorrowFirstPaymentDate] = useState("2026-09-01");

  // Outputs
  const [borrowingPower, setBorrowingPower] = useState(0);
  const [maxMonthlyAffordable, setMaxMonthlyAffordable] = useState(0);

  // ------------------------------------------------------------------------------
  // CALCULATOR 3: INTEREST ONLY STATE
  // ------------------------------------------------------------------------------
  const [ioLoanAmount, setIoLoanAmount] = useState(500000);
  const [ioInterestRate, setIoInterestRate] = useState(6.0);
  const [ioTotalTerm, setIoTotalTerm] = useState(30);
  const [ioTerm, setIoTerm] = useState(5);
  const [ioFirstPaymentDate, setIoFirstPaymentDate] = useState("2026-09-01");

  // Outputs
  const [ioMonthlyRepayment, setIoMonthlyRepayment] = useState(0);
  const [postIoMonthlyRepayment, setPostIoMonthlyRepayment] = useState(0);
  const [ioTotalInterest, setIoTotalInterest] = useState(0);
  const [ioTotalCost, setIoTotalCost] = useState(0);

  // ------------------------------------------------------------------------------
  // EFFECTS FOR CALCULATIONS
  // ------------------------------------------------------------------------------
  
  // 1. Calculate Loan Repayments
  useEffect(() => {
    const P = loanAmount;
    const annualR = interestRate / 100;
    const r = annualR / 12;
    const n = loanTerm * 12;

    if (n <= 0) return;

    let monthly = 0;
    if (r === 0) {
      monthly = P / n;
    } else {
      monthly = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    const totalPaid = monthly * n;
    const interest = totalPaid - P;

    setMonthlyRepayment(Math.round(monthly));
    setTotalInterestPaid(Math.round(interest));
    setTotalCostOfLoan(Math.round(totalPaid));
  }, [loanAmount, interestRate, loanTerm]);

  // 2. Calculate Borrowing Power
  useEffect(() => {
    // Serviceability buffer is standard 3% added to the base rate
    const bufferRate = (borrowInterestRate + 3) / 100;
    const r = bufferRate / 12;
    const n = 30 * 12; // Standard 30 year term assumed

    // Approximate net monthly income after tax (assuming ~25% average tax rate)
    const totalAnnualGross = annualIncome + otherIncome;
    const netMonthlyIncome = (totalAnnualGross * 0.75) / 12;

    // CC monthly commitment is estimated at 3% of limit
    const ccCommitment = creditCardLimit * 0.03;
    
    // Dependent buffer cost
    const dependentCost = dependents * 250;

    const totalMonthlyCommitments = monthlyExpenses + monthlyLoans + ccCommitment + dependentCost;
    const monthlySurplus = netMonthlyIncome - totalMonthlyCommitments;

    if (monthlySurplus <= 0 || r === 0) {
      setBorrowingPower(0);
      setMaxMonthlyAffordable(0);
      return;
    }

    // Banks qualify based on roughly 75% of surplus for loan repayments
    const maxAffordablePayment = monthlySurplus * 0.75;
    const maxLoan = (maxAffordablePayment * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n));

    setBorrowingPower(Math.round(maxLoan));
    setMaxMonthlyAffordable(Math.round(maxAffordablePayment));
  }, [annualIncome, otherIncome, monthlyExpenses, monthlyLoans, creditCardLimit, dependents, borrowInterestRate]);

  // 3. Calculate Interest Only Repayments
  useEffect(() => {
    const P = ioLoanAmount;
    const annualR = ioInterestRate / 100;
    const r = annualR / 12;
    
    // Interest Only Period (months)
    const ioMonths = ioTerm * 12;
    // Remaining P&I Period (months)
    const piMonths = (ioTotalTerm - ioTerm) * 12;

    if (piMonths <= 0) return;

    // Monthly repayment during IO
    const monthlyIo = P * r;

    // Monthly repayment during remaining P&I
    let monthlyPi = 0;
    if (r === 0) {
      monthlyPi = P / piMonths;
    } else {
      monthlyPi = (P * r * Math.pow(1 + r, piMonths)) / (Math.pow(1 + r, piMonths) - 1);
    }

    const totalInterest = (monthlyIo * ioMonths) + (monthlyPi * piMonths) - P;
    const totalCost = P + totalInterest;

    setIoMonthlyRepayment(Math.round(monthlyIo));
    setPostIoMonthlyRepayment(Math.round(monthlyPi));
    setIoTotalInterest(Math.round(totalInterest));
    setIoTotalCost(Math.round(totalCost));
  }, [ioLoanAmount, ioInterestRate, ioTotalTerm, ioTerm]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ---------------------------------------------------------------------- */}
      {/* HEADER SECTION & TABS OVERVIEW                                         */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row justify-between md:items-end border-b border-slate-200/60 pb-3 gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Mortgage Calculators</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Run instant lending estimations for client dossiers.
          </p>
        </div>

        {/* Tab Selectors (Matching 3rd screenshot layout) */}
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200/40">
          <button
            onClick={() => setActiveTab("Repayments")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "Repayments"
                ? `bg-white ${primaryText} shadow-xs`
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Loan Repayments
          </button>
          <button
            onClick={() => setActiveTab("Borrowing")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "Borrowing"
                ? `bg-white ${primaryText} shadow-xs`
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Borrowing Power
          </button>
          <button
            onClick={() => setActiveTab("InterestOnly")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "InterestOnly"
                ? `bg-white ${primaryText} shadow-xs`
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Interest Only
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: LOAN REPAYMENTS                                               */}
      {/* ==================================================================== */}
      {activeTab === "Repayments" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Left panel: Loan Details input (styled matching screenshot 3) */}
          <div className="md:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-soft-xl flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className={`text-base font-extrabold border-b border-slate-50 pb-2 ${primaryText}`}>
                Loan Details
              </h3>

              {/* Loan Amount Input (A$ prefix) */}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Loan Amount
                </label>
                <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none bg-slate-50 border-r border-slate-200/80 px-3">
                    <span className="text-xs font-bold text-slate-500">A$</span>
                  </div>
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full pl-14 pr-4 py-2.5 bg-white focus:outline-none focus:bg-slate-50/50 text-xs font-extrabold text-slate-700"
                  />
                </div>
              </div>

              {/* Interest Rate (per year) (% suffix) */}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Interest Rate (per year)
                </label>
                <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200">
                  <input
                    type="number"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full pl-4 pr-14 py-2.5 bg-white focus:outline-none focus:bg-slate-50/50 text-xs font-bold text-slate-700"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none bg-slate-50 border-l border-slate-200/80 px-3">
                    <span className="text-xs font-bold text-slate-500">%</span>
                  </div>
                </div>
              </div>

              {/* Loan Term Input (Represented as numbers instead of dropdown) */}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Loan Term (Years)
                </label>
                <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200">
                  <input
                    type="number"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(Number(e.target.value))}
                    className="w-full pl-4 pr-16 py-2.5 bg-white focus:outline-none focus:bg-slate-50/50 text-xs font-bold text-slate-700"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none bg-slate-50 border-l border-slate-200/80 px-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">years</span>
                  </div>
                </div>
              </div>

              {/* First Repayment Date (Input as requested instead of selected) */}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  First Repayment Date
                </label>
                <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    value={firstPaymentDate}
                    onChange={(e) => setFirstPaymentDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white focus:outline-none focus:bg-slate-50/50 text-xs font-bold text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 space-y-4">
              <button className={`w-full py-3 text-white rounded-xl text-xs font-bold shadow-md transition-all ${primaryBg} ${shadowBg}`}>
                Calculate Repayments
              </button>
              
              <div className="flex items-start gap-2 text-[10px] text-slate-400 leading-normal bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <p>
                  This calculator provides estimates only. Actual repayments may vary. Speak to one of our brokers for a personalised assessment.
                </p>
              </div>
            </div>
          </div>

          {/* Right panel: Estimated Repayments (styled matching screenshot 3) */}
          <div className="md:col-span-6 bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-inner flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className={`text-base font-extrabold ${primaryText}`}>Estimated Repayments</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  Calculated on a Principal & Interest schedule.
                </p>
              </div>

              {/* Monthly Repayment Box */}
              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 text-center shadow-soft-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/30 rounded-full blur-xl pointer-events-none" />
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Monthly Repayment
                </span>
                <span className={`text-4xl sm:text-5xl font-black tracking-tight block ${primaryText}`}>
                  ${monthlyRepayment.toLocaleString()}
                </span>
              </div>

              {/* Row Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-white border border-slate-200/50 p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Total Principal</span>
                  <span className="text-sm font-bold text-slate-700">${loanAmount.toLocaleString()}</span>
                </div>
                <div className="bg-white border border-slate-200/50 p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Total Interest Paid</span>
                  <span className="text-sm font-bold text-slate-700">${totalInterestPaid.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Total Cost of Loan (Huge footer stat) */}
            <div className="pt-6 border-t border-slate-200/60 mt-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Cost of Loan
              </span>
              <span className={`text-2xl font-black tracking-tight ${primaryText}`}>
                ${totalCostOfLoan.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: BORROWING POWER                                               */}
      {/* ==================================================================== */}
      {activeTab === "Borrowing" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Left panel: Financial Inputs */}
          <div className="md:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-soft-xl space-y-6">
            <h3 className={`text-base font-extrabold border-b border-slate-50 pb-2 ${primaryText}`}>
              Financial Circumstances
            </h3>

            {/* Annual Income */}
            <div>
              <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                Annual Salary (Before Tax)
              </label>
              <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none bg-slate-50 border-r border-slate-200/80 px-3">
                  <span className="text-xs font-bold text-slate-500">A$</span>
                </div>
                <input
                  type="number"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(Number(e.target.value))}
                  className="w-full pl-14 pr-4 py-2.5 bg-white focus:outline-none focus:bg-slate-50/50 text-xs font-extrabold text-slate-700"
                />
              </div>
            </div>

            {/* Expenses & Commitments */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Monthly Expenses
                </label>
                <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200">
                  <input
                    type="number"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                    className="w-full pl-3 pr-3 py-2.5 bg-white focus:outline-none focus:bg-slate-50/50 text-xs font-extrabold text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Other Monthly Loans
                </label>
                <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200">
                  <input
                    type="number"
                    value={monthlyLoans}
                    onChange={(e) => setMonthlyLoans(Number(e.target.value))}
                    className="w-full pl-3 pr-3 py-2.5 bg-white focus:outline-none focus:bg-slate-50/50 text-xs font-extrabold text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Credit Limits & Dependents */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Credit Card Limits
                </label>
                <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200">
                  <input
                    type="number"
                    value={creditCardLimit}
                    onChange={(e) => setCreditCardLimit(Number(e.target.value))}
                    className="w-full pl-3 pr-3 py-2.5 bg-white focus:outline-none focus:bg-slate-50/50 text-xs font-extrabold text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Dependents
                </label>
                <input
                  type="number"
                  min="0"
                  value={dependents}
                  onChange={(e) => setDependents(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-slate-50/50 text-xs font-extrabold text-slate-700"
                />
              </div>
            </div>

            {/* Base Interest Rate & Date inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Assumed Rate
                </label>
                <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200">
                  <input
                    type="number"
                    step="0.01"
                    value={borrowInterestRate}
                    onChange={(e) => setBorrowInterestRate(Number(e.target.value))}
                    className="w-full pl-3 pr-10 py-2.5 bg-white focus:outline-none text-xs font-bold text-slate-700"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none bg-slate-50 border-l border-slate-200/80 px-2.5">
                    <span className="text-[10px] font-bold text-slate-500">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={borrowFirstPaymentDate}
                  onChange={(e) => setBorrowFirstPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none text-xs font-bold text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Right panel: Estimated Borrowing Capacity */}
          <div className="md:col-span-6 bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-inner flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className={`text-base font-extrabold ${primaryText}`}>Borrowing Capacity</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  Based on standard APRA guidelines and serviceability buffer rules (+3.00%).
                </p>
              </div>

              {/* Borrowing Power Box */}
              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 text-center shadow-soft-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/30 rounded-full blur-xl pointer-events-none" />
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  ESTIMATED BORROWING UP TO
                </span>
                <span className={`text-3xl sm:text-4xl font-black tracking-tight block ${primaryText}`}>
                  A$ {borrowingPower.toLocaleString()}
                </span>
              </div>

              {/* Serviceability info */}
              <div className="bg-white border border-slate-200/50 p-4.5 rounded-2xl space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Assessed Interest Rate</span>
                  <span className={primaryText}>{(borrowInterestRate + 3).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Max Monthly Repayment Capacity</span>
                  <span className="text-slate-800">${maxMonthlyAffordable.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200/60 mt-6 text-[10px] text-slate-400 leading-normal">
              Disclaimer: Lending capacity varies by lender scorecard parameters, debt-to-income (DTI) caps, and actual expenses verification.
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: INTEREST ONLY                                                 */}
      {/* ==================================================================== */}
      {activeTab === "InterestOnly" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Left panel: Interest Only Details */}
          <div className="md:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-soft-xl space-y-6">
            <h3 className={`text-base font-extrabold border-b border-slate-50 pb-2 ${primaryText}`}>
              Interest Only Terms
            </h3>

            {/* Loan Amount */}
            <div>
              <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                Loan Amount
              </label>
              <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none bg-slate-50 border-r border-slate-200/80 px-3">
                  <span className="text-xs font-bold text-slate-500">A$</span>
                </div>
                <input
                  type="number"
                  value={ioLoanAmount}
                  onChange={(e) => setIoLoanAmount(Number(e.target.value))}
                  className="w-full pl-14 pr-4 py-2.5 bg-white focus:outline-none text-xs font-extrabold text-slate-700"
                />
              </div>
            </div>

            {/* Interest Rate */}
            <div>
              <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                Interest Rate (per year)
              </label>
              <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200">
                <input
                  type="number"
                  step="0.01"
                  value={ioInterestRate}
                  onChange={(e) => setIoInterestRate(Number(e.target.value))}
                  className="w-full pl-4 pr-14 py-2.5 bg-white focus:outline-none text-xs font-bold text-slate-700"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none bg-slate-50 border-l border-slate-200/80 px-3">
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>
            </div>

            {/* Terms grid: total term and IO term */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Total Term (Years)
                </label>
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <input
                    type="number"
                    value={ioTotalTerm}
                    onChange={(e) => setIoTotalTerm(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white focus:outline-none text-xs font-bold text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Interest Only Term (Years)
                </label>
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <input
                    type="number"
                    value={ioTerm}
                    onChange={(e) => setIoTerm(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white focus:outline-none text-xs font-bold text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* First Payment Date (Input) */}
            <div>
              <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                First Repayment Date
              </label>
              <input
                type="date"
                value={ioFirstPaymentDate}
                onChange={(e) => setIoFirstPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none text-xs font-bold text-slate-700"
              />
            </div>
          </div>

          {/* Right panel: Interest Only Repayments details */}
          <div className="md:col-span-6 bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-inner flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className={`text-base font-extrabold ${primaryText}`}>Interest Only Repayments</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  Compares interest-only periods against subsequent amortization terms.
                </p>
              </div>

              {/* Repayments Comparisons Boxes */}
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white border border-slate-200/50 p-5 rounded-2xl text-center shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                    MONTHLY INTEREST-ONLY REPAYMENT ({ioTerm} Years)
                  </span>
                  <span className={`text-2xl font-black ${primaryText}`}>${ioMonthlyRepayment.toLocaleString()}</span>
                </div>

                <div className="bg-white border border-slate-200/50 p-5 rounded-2xl text-center shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                    MONTHLY P&I REPAYMENT (Remaining {ioTotalTerm - ioTerm} Years)
                  </span>
                  <span className="text-2xl font-black text-slate-700">${postIoMonthlyRepayment.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Cost indicators */}
            <div className="pt-6 border-t border-slate-200/60 mt-6 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Total Interest Paid</span>
                <span className={`text-lg font-black ${primaryText}`}>${ioTotalInterest.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Total Cost of Loan</span>
                <span className="text-lg font-black text-slate-700">${ioTotalCost.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
