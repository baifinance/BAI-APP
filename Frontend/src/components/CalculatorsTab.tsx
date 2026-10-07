/**
 * ==============================================================================
 * COMPONENT: CalculatorsTab.tsx
 * Path: src/app/broker/components/CalculatorsTab.tsx
 * Description: Interactive financial calculators (Repayments, Borrowing Power,
 *              Interest Only) styled premium, matching screenshot 3.
 * ==============================================================================
 */

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Calculator,
  Calendar,
  Info,
  Printer,
  BarChart3,
  Eye,
  X,
} from "lucide-react";
import calcIllustration from "@/assets/brand/calculator_illustration.jpg";

type CalcTab = "Repayments" | "Borrowing" | "InterestOnly";

interface CalculatorsTabProps {
  variant?: "broker" | "loan_processing" | "client";
}

interface LoanBalanceChartProps {
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  monthlyRepayment: number;
  totalCostOfLoan: number;
  /** Callback triggered when user clicks the Eye icon to pop out the graph */
  onExpand?: () => void;
  /** Whether the chart is currently rendered inside the enlarged floating window */
  isExpanded?: boolean;
  /** Callback triggered when user clicks the exit 'X' button in the floating window */
  onClose?: () => void;
}

function LoanBalanceChart({
  loanAmount,
  interestRate,
  loanTerm,
  monthlyRepayment,
  totalCostOfLoan,
  onExpand,
  isExpanded = false,
  onClose,
}: LoanBalanceChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const dataPoints = useMemo(() => {
    const points = [];
    const P = loanAmount;
    const annualR = interestRate / 100;
    const r = annualR / 12;
    const totalMonths = loanTerm * 12;
    const M = monthlyRepayment;

    for (let yr = 0; yr <= loanTerm; yr++) {
      const k = yr * 12;
      let balance = 0;
      if (yr === 0) {
        balance = P;
      } else if (yr === loanTerm) {
        balance = 0;
      } else {
        if (r === 0) {
          balance = Math.max(0, P - (P / totalMonths) * k);
        } else {
          const factor = Math.pow(1 + r, k);
          balance = Math.max(0, P * factor - (M * (factor - 1)) / r);
        }
      }

      const totalRemaining = Math.max(0, M * (totalMonths - k));

      points.push({
        year: yr,
        balance: Math.round(balance),
        totalRemaining: Math.round(totalRemaining),
      });
    }
    return points;
  }, [loanAmount, interestRate, loanTerm, monthlyRepayment]);

  const maxVal = Math.max(
    totalCostOfLoan > 0 ? totalCostOfLoan : loanAmount * 1.5,
    loanAmount * 1.2
  );
  const roundTo = maxVal > 1000000 ? 500000 : 100000;
  const yMax = Math.ceil((maxVal * 1.05) / roundTo) * roundTo;

  // Chart dimensions & padding: larger viewBox in floating view for high clarity
  const viewBoxWidth = isExpanded ? 840 : 520;
  const viewBoxHeight = isExpanded ? 420 : 290;
  const padLeft = isExpanded ? 80 : 65;
  const padRight = isExpanded ? 30 : 20;
  const padTop = isExpanded ? 30 : 25;
  const padBottom = isExpanded ? 50 : 45;
  const chartW = viewBoxWidth - padLeft - padRight;
  const chartH = viewBoxHeight - padTop - padBottom;

  const getX = (yr: number) => padLeft + (yr / loanTerm) * chartW;
  const getY = (val: number) => padTop + chartH - (val / yMax) * chartH;

  const totalPayLinePath = dataPoints
    .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${getX(pt.year)} ${getY(pt.totalRemaining)}`)
    .join(" ");
  const totalPayAreaPath = `${totalPayLinePath} L ${getX(loanTerm)} ${padTop + chartH} L ${getX(0)} ${padTop + chartH} Z`;

  const loanBalLinePath = dataPoints
    .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${getX(pt.year)} ${getY(pt.balance)}`)
    .join(" ");
  const loanBalAreaPath = `${loanBalLinePath} L ${getX(loanTerm)} ${padTop + chartH} L ${getX(0)} ${padTop + chartH} Z`;

  const formatCurrencyTick = (val: number) => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (val >= 1000) {
      return `$${Math.round(val / 1000)}K`;
    }
    return `$${Math.round(val)}`;
  };

  const xTicks = useMemo(() => {
    const ticks = [];
    const step = loanTerm <= 10 ? 2 : 5;
    for (let yr = 0; yr <= loanTerm; yr += step) {
      ticks.push(yr);
    }
    if (!ticks.includes(loanTerm)) {
      ticks.push(loanTerm);
    }
    return ticks;
  }, [loanTerm]);

  const yTicks = [0, yMax / 2, yMax];

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------------------- */}
      {/* CHART HEADER: Title, Legends, Eye Expand Icon / Exit 'X' Icon          */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <h4 className={`${isExpanded ? "text-base sm:text-lg font-black" : "text-sm font-extrabold"} text-slate-800`}>
            Loan Balance Chart
          </h4>
          {isExpanded && (
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0A2881] border border-blue-200/60 tracking-wider">
              Floating View
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
          {/* Chart Legends */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#0B2369]" />
              <span className="text-slate-700">Loan Balance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#16A34A]" />
              <span className="text-slate-700">Total Payment</span>
            </div>
          </div>

          {/* Action Button: Eye Icon to Expand when normal, 'X' Exit Button when in floating window */}
          {isExpanded ? (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-200/80 shadow-2xs flex items-center justify-center ml-1"
              title="Exit floating window"
              aria-label="Exit floating window"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            onExpand && (
              <button
                type="button"
                onClick={onExpand}
                className="p-1.5 text-slate-400 hover:text-[#0A2881] hover:bg-blue-50/80 active:bg-blue-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-100 flex items-center justify-center ml-1"
                title="View graph in floating window"
                aria-label="View graph in floating window"
              >
                <Eye className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SVG INTERACTIVE CHART                                                  */}
      {/* ---------------------------------------------------------------------- */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="totalPayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16A34A" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#16A34A" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="loanBalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0B2369" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y axis ticks */}
          {yTicks.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + chartW}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray={idx > 0 && idx < yTicks.length - 1 ? "3 3" : undefined}
                />
                <text
                  x={padLeft - (isExpanded ? 10 : 8)}
                  y={y + (isExpanded ? 5 : 4)}
                  textAnchor="end"
                  className={`${isExpanded ? "text-[13px]" : "text-[11px]"} font-bold fill-slate-500`}
                >
                  {formatCurrencyTick(val)}
                </text>
              </g>
            );
          })}

          {/* Y Axis Line */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={padTop + chartH}
            stroke="#0284C7"
            strokeWidth="1.5"
          />

          {/* X Axis Line */}
          <line
            x1={padLeft}
            y1={padTop + chartH}
            x2={padLeft + chartW}
            y2={padTop + chartH}
            stroke="#64748B"
            strokeWidth="1.5"
          />

          {/* Y-Axis Label "Amount Owing" */}
          <text
            x={-(padTop + chartH / 2)}
            y={isExpanded ? 24 : 16}
            transform="rotate(-90)"
            textAnchor="middle"
            className={`${isExpanded ? "text-[13px]" : "text-[11px]"} font-extrabold fill-slate-600`}
          >
            Amount Owing
          </text>

          {/* Total Payment Area & Line (Green) */}
          <path d={totalPayAreaPath} fill="url(#totalPayGrad)" />
          <path
            d={totalPayLinePath}
            fill="none"
            stroke="#16A34A"
            strokeWidth={isExpanded ? "3.5" : "2.5"}
            strokeLinecap="round"
          />

          {/* Loan Balance Area & Line (Navy Blue) */}
          <path d={loanBalAreaPath} fill="url(#loanBalGrad)" />
          <path
            d={loanBalLinePath}
            fill="none"
            stroke="#0B2369"
            strokeWidth={isExpanded ? "3.5" : "2.5"}
            strokeLinecap="round"
          />

          {/* X Axis Ticks & Labels */}
          {xTicks.map((yr, idx) => {
            const x = getX(yr);
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={padTop + chartH}
                  x2={x}
                  y2={padTop + chartH + (isExpanded ? 6 : 5)}
                  stroke="#94A3B8"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={padTop + chartH + (isExpanded ? 22 : 18)}
                  textAnchor="middle"
                  className={`${isExpanded ? "text-[13px]" : "text-[11px]"} font-bold fill-slate-600`}
                >
                  {yr}
                </text>
              </g>
            );
          })}

          {/* X-Axis Label "Years" */}
          <text
            x={padLeft + chartW / 2}
            y={padTop + chartH + (isExpanded ? 44 : 36)}
            textAnchor="middle"
            className={`${isExpanded ? "text-[13px]" : "text-[11px]"} font-extrabold fill-slate-600`}
          >
            Years
          </text>

          {/* Interactive hover overlay */}
          {dataPoints.map((pt, idx) => {
            const x = getX(pt.year);
            const w = chartW / loanTerm;
            return (
              <rect
                key={idx}
                x={x - w / 2}
                y={padTop}
                width={w}
                height={chartH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
              />
            );
          })}

          {/* Hover highlight markers */}
          {hoverIndex !== null && dataPoints[hoverIndex] && (
            <g pointerEvents="none">
              <line
                x1={getX(dataPoints[hoverIndex].year)}
                y1={padTop}
                x2={getX(dataPoints[hoverIndex].year)}
                y2={padTop + chartH}
                stroke="#64748B"
                strokeWidth={isExpanded ? "2" : "1.5"}
                strokeDasharray="3 3"
              />
              {/* Total payment marker */}
              <circle
                cx={getX(dataPoints[hoverIndex].year)}
                cy={getY(dataPoints[hoverIndex].totalRemaining)}
                r={isExpanded ? "6" : "4.5"}
                fill="#16A34A"
                stroke="#ffffff"
                strokeWidth={isExpanded ? "2.5" : "2"}
              />
              {/* Loan balance marker */}
              <circle
                cx={getX(dataPoints[hoverIndex].year)}
                cy={getY(dataPoints[hoverIndex].balance)}
                r={isExpanded ? "6" : "4.5"}
                fill="#0B2369"
                stroke="#ffffff"
                strokeWidth={isExpanded ? "2.5" : "2"}
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay with real-time year calculations */}
        {hoverIndex !== null && dataPoints[hoverIndex] && (
          <div
            className={`absolute ${isExpanded ? "top-3 right-3 p-3.5 text-sm" : "top-2 right-2 p-2.5 text-xs"} bg-slate-900/95 backdrop-blur-xs text-white rounded-xl shadow-xl space-y-1.5 pointer-events-none border border-slate-700/60 z-10`}
          >
            <div className="font-extrabold text-slate-200 border-b border-slate-700/80 pb-1">
              Year {dataPoints[hoverIndex].year} of {loanTerm}
            </div>
            <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold">
              <span>Total Remaining:</span>
              <span>${dataPoints[hoverIndex].totalRemaining.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-blue-300 font-bold">
              <span>Loan Balance:</span>
              <span>${dataPoints[hoverIndex].balance.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* CHART FOOTER: Accreditation Badge, Print Button, Amortisation Tag     */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {/* MFAA Accredited Badge */}
          <div className="bg-[#0B2369] text-white px-3 py-1 rounded-md text-[11px] font-black tracking-wider flex items-center gap-1 shadow-2xs">
            <span>mfaa</span>
            <span className="text-[9px] font-medium text-slate-300">accredited</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Standard Amortisation
          </div>
        </div>
      </div>
    </div>
  );
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
  const [otherIncome] = useState(10000);
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

  // ------------------------------------------------------------------------------
  // CLIENT CALCULATOR REWORKED STATE
  // ------------------------------------------------------------------------------
  const [clientLoanAmount, setClientLoanAmount] = useState<string | number>(500000);
  const [clientInterestRate, setClientInterestRate] = useState<string | number>(6.0);
  const [clientLoanTerm, setClientLoanTerm] = useState<number>(30);
  const [isCalculatedClient, setIsCalculatedClient] = useState<boolean>(false);

  // Floating Window State: expands graph into floating window modal at the front
  const [isGraphExpanded, setIsGraphExpanded] = useState<boolean>(false);

  // Accessibility: Close floating window when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isGraphExpanded) {
        setIsGraphExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGraphExpanded]);

  const handleCalculateClient = () => {
    const P = typeof clientLoanAmount === "string" ? parseFloat(clientLoanAmount) || 0 : clientLoanAmount;
    const annualR = (typeof clientInterestRate === "string" ? parseFloat(clientInterestRate) || 0 : clientInterestRate) / 100;
    const r = annualR / 12;
    const n = clientLoanTerm * 12;

    if (n <= 0 || P <= 0) return;

    let monthly = 0;
    if (r === 0) {
      monthly = P / n;
    } else {
      monthly = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    const totalPaid = monthly * n;
    const interest = totalPaid - P;

    setMonthlyRepayment(Math.round(monthly * 100) / 100);
    setTotalInterestPaid(Math.round(interest * 100) / 100);
    setTotalCostOfLoan(Math.round(totalPaid * 100) / 100);
    setIsCalculatedClient(true);
  };

  // Dedicated Reworked Layout for Client Calculator Page
  if (isClient) {
    const numLoanAmount = typeof clientLoanAmount === "string" ? parseFloat(clientLoanAmount) || 0 : clientLoanAmount;
    const numInterestRate = typeof clientInterestRate === "string" ? parseFloat(clientInterestRate) || 0 : clientInterestRate;

    return (
      <div className="w-full pb-12">
        {/* Full-width Dynamic Edge-to-Edge Blue Banner (still, non-transitioning) */}
        <div className="w-full min-w-full py-8 sm:py-10 md:py-12 lg:py-14 px-4 sm:px-6 md:px-8 lg:px-12 text-center text-white bg-[#0A2881] shadow-md flex flex-col items-center justify-center space-y-2 shrink-0">
          <span className="text-[10px] sm:text-xs md:text-sm font-extrabold uppercase tracking-widest text-white/80 block">
            Financial Tools
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight max-w-4xl leading-tight">
            Mortgage Calculator
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-white/80 font-medium max-w-2xl px-2">
            Estimate your monthly repayments based on loan amount, interest rate, and loan term.
          </p>
        </div>

        {/* Page Content Container */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-8 space-y-8">
          {/* 2-Container Layout (Top Section) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Left Container: Calculator */}
          <div className="md:col-span-6 bg-white border border-slate-200/80 rounded-2xl shadow-soft-xl overflow-hidden flex flex-col justify-between">
            {/* Full-width Blue Header with #E4BA37 Text */}
            <div className="bg-[#0A2881] px-6 py-4 flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#E4BA37]">
                <Calculator className="w-4 h-4 text-[#E4BA37]" />
              </div>
              <h3 className="text-base font-black text-[#E4BA37]">
                Loan Calculator
              </h3>
            </div>

            {/* Inner Body with Inputs & Actions */}
            <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6 flex-1">
              <div className="space-y-6">
                {/* Field 1: Loan Amount */}
                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                    Loan Amount
                  </label>
                  <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200 focus-within:border-[#0A2881] transition-colors">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none bg-[#0A2881] border-r border-[#071D60] px-3">
                      <span className="text-xs font-black text-[#E4BA37]">A$</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 400000.00"
                      value={clientLoanAmount}
                      onChange={(e) => setClientLoanAmount(e.target.value)}
                      className="w-full pl-14 pr-4 py-3 bg-white focus:outline-none text-xs sm:text-sm font-extrabold text-slate-800"
                    />
                  </div>
                </div>

                {/* Field 2: Interest Rate */}
                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                    Interest Rate
                  </label>
                  <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200 focus-within:border-[#0A2881] transition-colors">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 6.00"
                      value={clientInterestRate}
                      onChange={(e) => setClientInterestRate(e.target.value)}
                      className="w-full pl-4 pr-14 py-3 bg-white focus:outline-none text-xs sm:text-sm font-extrabold text-slate-800"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none bg-slate-50 border-l border-slate-200 px-3">
                      <span className="text-xs font-bold text-slate-600">%</span>
                    </div>
                  </div>
                </div>

                {/* Field 3: Loan Term */}
                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                    Loan Term
                  </label>
                  <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200 focus-within:border-[#0A2881] transition-colors">
                    <select
                      value={clientLoanTerm}
                      onChange={(e) => setClientLoanTerm(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white focus:outline-none text-xs sm:text-sm font-extrabold text-slate-800 cursor-pointer"
                    >
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((yr) => (
                        <option key={yr} value={yr}>
                          {yr} {yr === 1 ? "Year" : "Years"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Bottom Button */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  onClick={handleCalculateClient}
                  className="flex-1 py-3.5 bg-[#0A2881] hover:bg-[#071D60] text-[#E4BA37] rounded-xl text-xs sm:text-sm font-extrabold shadow-md shadow-[#0A2881]/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calculator className="w-4 h-4 text-[#E4BA37]" />
                  Calculate Repayments
                </button>
                {isCalculatedClient && (
                  <button
                    onClick={() => {
                      setIsCalculatedClient(false);
                      setIsGraphExpanded(false);
                    }}
                    className="px-4 py-3.5 bg-slate-100 hover:bg-red-600 hover:text-white active:bg-red-700 active:text-white text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Container: Visual */}
          <div className="md:col-span-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-inner flex flex-col justify-between min-h-[460px]">
            <div className="h-full flex flex-col justify-between items-center text-center">
              <div className="w-full flex-1 flex items-center justify-center p-4">
                <Image
                  src={calcIllustration}
                  alt="Ready to calculate visual"
                  sizes="(max-width: 768px) 100vw, 24rem"
                  className="w-full max-w-xs md:max-w-sm h-full max-h-72 object-contain rounded-2xl shadow-xs"
                />
              </div>

              <div className="w-full flex flex-col items-center justify-center text-center pt-4 border-t border-slate-200/60">
                <h3 className="text-xl font-bold text-slate-800 text-center mb-1.5">
                  Ready to calculate?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 text-center max-w-sm">
                  Enter your loan details to the left to see your estimated repayments
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Container: Calculation Results & Loan Balance Chart (inside max-w-7xl with space-y-8 spacing) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-soft-xl overflow-hidden">
          {/* Full-width Blue Header with #E4BA37 Text and 'Calculation Results' only */}
          <div className="bg-[#0A2881] px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#E4BA37]">
                <BarChart3 className="w-4 h-4 text-[#E4BA37]" />
              </div>
              <h3 className="text-base font-black text-[#E4BA37]">
                Calculation Results
              </h3>
            </div>
            {isCalculatedClient && (
              <span className="text-[11px] font-bold px-3 py-1 bg-white/15 text-[#E4BA37] border border-white/20 rounded-full">
                Active Calculation
              </span>
            )}
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8">

          {!isCalculatedClient ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                <Info className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-600">
                No calculations are being performed.
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                Enter your loan amount, interest rate, and term above, then click &quot;Calculate Repayments&quot; to view results and chart.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left side: Results in list form */}
              <div className="lg:col-span-5 space-y-6">
                {/* Input details list (in order: Loan Amount, Interest Rate, Loan Term) */}
                <div>
                  <h4 className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-3">
                    Input Details
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm">
                      <span className="font-semibold text-slate-600">Loan Amount</span>
                      <span className="font-extrabold text-slate-900">
                        ${numLoanAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </li>
                    <li className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm">
                      <span className="font-semibold text-slate-600">Interest Rate</span>
                      <span className="font-extrabold text-slate-900">
                        {numInterestRate}%
                      </span>
                    </li>
                    <li className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm">
                      <span className="font-semibold text-slate-600">Loan Term</span>
                      <span className="font-extrabold text-slate-900">
                        {clientLoanTerm} {clientLoanTerm === 1 ? "year" : "years"}
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Line divider */}
                <div className="border-t border-slate-200/80 my-4" />

                {/* Results list (in order: Monthly Repayments, Total Payments, Total Interest) */}
                <div>
                  <h4 className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-3">
                    Repayment Results
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between items-center py-3 px-4 rounded-xl bg-blue-50/70 border border-blue-200/50 text-xs sm:text-sm">
                      <span className="font-bold text-[#0024A8]">Monthly Repayments</span>
                      <span className="text-base sm:text-lg font-black text-[#0024A8]">
                        ${monthlyRepayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </li>
                    <li className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm">
                      <span className="font-semibold text-slate-600">Total Payments</span>
                      <span className="font-extrabold text-slate-900">
                        ${Math.round(totalCostOfLoan).toLocaleString()}
                      </span>
                    </li>
                    <li className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm">
                      <span className="font-semibold text-slate-600">Total Interest</span>
                      <span className="font-extrabold text-slate-900">
                        ${Math.round(totalInterestPaid).toLocaleString()}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* ---------------------------------------------------------------- */}
              {/* RIGHT SIDE: Loan Balance Chart (Inline / Moved to Floating View) */}
              {/* ---------------------------------------------------------------- */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-center">
                {isGraphExpanded ? (
                  /* Placeholder displayed in the page when graph view is moved to the floating window */
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-blue-200/80 rounded-2xl bg-blue-50/25">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0A2881] flex items-center justify-center mb-3 shadow-inner">
                      <Eye className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-800">
                      Graph Moved to Floating Window
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      The loan balance chart is currently open in front in an expanded floating view.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsGraphExpanded(false)}
                      className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-slate-400" />
                      Restore Graph to Page
                    </button>
                  </div>
                ) : (
                  <LoanBalanceChart
                    loanAmount={numLoanAmount}
                    interestRate={numInterestRate}
                    loanTerm={clientLoanTerm}
                    monthlyRepayment={monthlyRepayment}
                    totalCostOfLoan={totalCostOfLoan}
                    onExpand={() => setIsGraphExpanded(true)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ==================================================================== */}
    {/* FLOATING WINDOW: EXPANDED GRAPH VIEW (AT THE FRONT)                  */}
    {/* ==================================================================== */}
    {isGraphExpanded && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Expanded Loan Balance Chart"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
        onClick={() => setIsGraphExpanded(false)}
      >
        {/* Floating Window Dialog Container (clicks inside do not dismiss) */}
        <div
          className="relative bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-5 sm:p-8 space-y-4 transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          <LoanBalanceChart
            loanAmount={numLoanAmount}
            interestRate={numInterestRate}
            loanTerm={clientLoanTerm}
            monthlyRepayment={monthlyRepayment}
            totalCostOfLoan={totalCostOfLoan}
            isExpanded={true}
            onClose={() => setIsGraphExpanded(false)}
          />
        </div>
      </div>
    )}
  </div>
);
}

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
