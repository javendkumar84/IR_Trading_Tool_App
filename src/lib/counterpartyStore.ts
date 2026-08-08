import { Counterparty } from '../types';

export const DEFAULT_COUNTERPARTIES: Counterparty[] = [
  { id: 'CP-GS', name: 'Goldman Sachs International', lei: 'W22LROWP2IHZNBB6K528', country: 'United Kingdom', rating: 'A+', creditLimitMillions: 500 },
  { id: 'CP-JPM', name: 'JPMorgan Chase Bank, N.A.', lei: '7H6GLXDRUGV21P84J029', country: 'United States', rating: 'AA', creditLimitMillions: 750 },
  { id: 'CP-MS', name: 'Morgan Stanley & Co. International plc', lei: '4P4TIKJK8DH0UK7F9356', country: 'United Kingdom', rating: 'A+', creditLimitMillions: 450 },
  { id: 'CP-BARC', name: 'Barclays Bank PLC', lei: 'G5GSEF7VJP5I7OUK5573', country: 'United Kingdom', rating: 'A', creditLimitMillions: 400 },
  { id: 'CP-CITI', name: 'Citigroup Global Markets Limited', lei: 'XKLBGG7Z382F0581B340', country: 'United Kingdom', rating: 'A+', creditLimitMillions: 600 },
  { id: 'CP-DB', name: 'Deutsche Bank AG', lei: '7LTWFZYICNSX8D621K86', country: 'Germany', rating: 'A-', creditLimitMillions: 350 },
  { id: 'CP-UBS', name: 'UBS AG', lei: 'BFM8T6105TLKC55HOL60', country: 'Switzerland', rating: 'AA-', creditLimitMillions: 550 },
  { id: 'CP-BNP', name: 'BNP Paribas', lei: 'R0540H88242JBH8W5143', country: 'France', rating: 'A+', creditLimitMillions: 500 },
  { id: 'CP-HSBC', name: 'HSBC Bank plc', lei: 'MP6I5ZYZBEU3UXPYFY54', country: 'United Kingdom', rating: 'AA-', creditLimitMillions: 650 },
];

const LOCAL_STORAGE_KEY = 'IR_SWAP_COUNTERPARTIES';

function loadCounterparties(): Counterparty[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load counterparties from localStorage:', err);
  }
  return DEFAULT_COUNTERPARTIES;
}

let counterparties: Counterparty[] = loadCounterparties();
const listeners: Array<() => void> = [];

export function getCounterparties(): Counterparty[] {
  return counterparties;
}

export function addCounterparty(newCp: Omit<Counterparty, 'id'>): Counterparty {
  const id = `CP-CUST-${Date.now()}`;
  const counterparty: Counterparty = { ...newCp, id };
  counterparties = [counterparty, ...counterparties];

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(counterparties));
  } catch (err) {
    console.error('Failed to save counterparty to localStorage:', err);
  }

  listeners.forEach((l) => l());
  return counterparty;
}

export function subscribeCounterparties(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
