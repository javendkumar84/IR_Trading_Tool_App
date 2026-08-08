import { XmlComparisonReport, XmlDiffNode } from '../types';

interface XmlSimpleNode {
  path: string;
  name: string;
  value: string;
  attributes: Record<string, string>;
  children: XmlSimpleNode[];
}

/**
  * Cleans and normalizes raw XML string by stripping whitespace between tags.
  */
export function normalizeXmlString(xml: string): string {
  if (!xml) return '';
  return xml
    .replace(/>\s+</g, '><')
    .replace(/^\s+|\s+$/g, '')
    .trim();
}

/**
  * Parses an XML string into a lightweight recursive tree representation using DOMParser or regex fallback.
  */
export function parseXmlToTree(xml: string, parentPath = ''): XmlSimpleNode {
  const normalized = normalizeXmlString(xml);
  
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(normalized, 'text/xml');
    const root = doc.documentElement;
    if (root && root.nodeName !== 'parsererror') {
      return domElementToNode(root, parentPath);
    }
  }

  // Regex fallback parser for environments without DOMParser
  return regexXmlParser(normalized, parentPath);
}

function domElementToNode(el: Element, parentPath: string): XmlSimpleNode {
  const name = el.nodeName;
  const currentPath = parentPath ? `${parentPath}/${name}` : name;
  const attributes: Record<string, string> = {};

  if (el.attributes) {
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      attributes[attr.name] = attr.value;
    }
  }

  const children: XmlSimpleNode[] = [];
  let directText = '';

  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes[i];
    if (child.nodeType === 1) { // Element node
      children.push(domElementToNode(child as Element, currentPath));
    } else if (child.nodeType === 3 || child.nodeType === 4) { // Text or CDATA node
      const val = child.nodeValue ? child.nodeValue.trim() : '';
      if (val) directText += (directText ? ' ' : '') + val;
    }
  }

  return {
    path: currentPath,
    name,
    value: directText,
    attributes,
    children,
  };
}

function regexXmlParser(xml: string, parentPath: string): XmlSimpleNode {
  const match = xml.match(/^<([^\s>]+)([^>]*)>(.*)<\/\1>$/s);
  if (!match) {
    return {
      path: parentPath || 'root',
      name: 'root',
      value: xml.replace(/<[^>]+>/g, '').trim(),
      attributes: {},
      children: [],
    };
  }

  const name = match[1];
  const currentPath = parentPath ? `${parentPath}/${name}` : name;
  const innerContent = match[3];

  const children: XmlSimpleNode[] = [];
  const childTagRegex = /<([^\s>]+)(?:[^>]*)>(?:.*?)<\/\1>|<([^\s>\/]+)\/>/gs;
  let childMatch: RegExpExecArray | null;
  
  while ((childMatch = childTagRegex.exec(innerContent)) !== null) {
    children.push(regexXmlParser(childMatch[0], currentPath));
  }

  const textValue = children.length === 0 ? innerContent.replace(/<[^>]+>/g, '').trim() : '';

  return {
    path: currentPath,
    name,
    value: textValue,
    attributes: {},
    children,
  };
}

/**
  * Flatten node tree into a map of path -> text value
  */
export function flattenXmlNodes(node: XmlSimpleNode, nodeMap: Map<string, string> = new Map()): Map<string, string> {
  const childCounts = new Map<string, number>();

  for (const child of node.children) {
    const count = (childCounts.get(child.name) || 0) + 1;
    childCounts.set(child.name, count);

    const indexedPath = `${node.path}/${child.name}[${count}]`;
    if (child.children.length === 0) {
      nodeMap.set(indexedPath, child.value);
    } else {
      flattenXmlNodes({ ...child, path: indexedPath }, nodeMap);
    }
  }

  if (node.children.length === 0 && node.value) {
    nodeMap.set(node.path, node.value);
  }

  return nodeMap;
}

/**
  * Compares two XML strings (Original vs Amended or Expected vs Actual) and returns a detailed comparison report.
  */
export function compareXmlFiles(originalXml: string, amendedXml: string): XmlComparisonReport {
  const normOriginal = normalizeXmlString(originalXml);
  const normAmended = normalizeXmlString(amendedXml);

  if (!normOriginal || !normAmended) {
    return {
      success: false,
      status: 'FAIL',
      totalNodesCompared: 0,
      matchingNodes: 0,
      mismatchedNodes: 1,
      missingNodes: normOriginal ? 0 : 1,
      addedNodes: normAmended ? 0 : 1,
      differences: [{
        path: 'root',
        nodeName: 'XML_DOC',
        type: 'VALUE_MISMATCH',
        originalValue: normOriginal ? 'PRESENT' : 'EMPTY',
        amendedValue: normAmended ? 'PRESENT' : 'EMPTY',
        status: 'FAIL',
      }],
      summaryText: 'FAILURE: One or both XML inputs are empty.',
    };
  }

  const tree1 = parseXmlToTree(normOriginal);
  const tree2 = parseXmlToTree(normAmended);

  const map1 = flattenXmlNodes(tree1);
  const map2 = flattenXmlNodes(tree2);

  const differences: XmlDiffNode[] = [];
  let matchingNodes = 0;
  let mismatchedNodes = 0;
  let missingNodes = 0;
  let addedNodes = 0;

  const allKeys = new Set([...map1.keys(), ...map2.keys()]);

  allKeys.forEach((key) => {
    const val1 = map1.get(key);
    const val2 = map2.get(key);
    const nodeName = key.split('/').pop()?.replace(/\[\d+\]$/, '') || key;

    if (val1 !== undefined && val2 !== undefined) {
      if (val1 === val2) {
        matchingNodes++;
        differences.push({
          path: key,
          nodeName,
          type: 'MATCH',
          originalValue: val1,
          amendedValue: val2,
          expectedValue: val1,
          actualValue: val2,
          status: 'PASS',
        });
      } else {
        mismatchedNodes++;
        differences.push({
          path: key,
          nodeName,
          type: 'VALUE_MISMATCH',
          originalValue: val1,
          amendedValue: val2,
          expectedValue: val1,
          actualValue: val2,
          status: 'FAIL',
        });
      }
    } else if (val1 !== undefined && val2 === undefined) {
      missingNodes++;
      differences.push({
        path: key,
        nodeName,
        type: 'MISSING_NODE',
        originalValue: val1,
        amendedValue: '[MISSING]',
        expectedValue: val1,
        actualValue: undefined,
        status: 'FAIL',
      });
    } else if (val1 === undefined && val2 !== undefined) {
      addedNodes++;
      differences.push({
        path: key,
        nodeName,
        type: 'ADDITIONAL_NODE',
        originalValue: '[ABSENT]',
        amendedValue: val2,
        expectedValue: undefined,
        actualValue: val2,
        status: 'FAIL',
      });
    }
  });

  const isPass = mismatchedNodes === 0 && missingNodes === 0 && addedNodes === 0;

  const summaryText = isPass
    ? `PASS: XML structures match perfectly across ${matchingNodes} nodes.`
    : `FAIL: Mismatches detected! Mismatched: ${mismatchedNodes}, Missing: ${missingNodes}, Added: ${addedNodes}.`;

  return {
    success: isPass,
    status: isPass ? 'PASS' : 'FAIL',
    totalNodesCompared: allKeys.size,
    matchingNodes,
    mismatchedNodes,
    missingNodes,
    addedNodes,
    differences,
    summaryText,
  };
}

/**
  * Renders comparison result as formatted HTML string for UI and PDF embedding.
  */
export function generateXmlDiffHtml(report: XmlComparisonReport): string {
  if (report.differences.length === 0) {
    return `<div class="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded text-xs font-mono">✓ XML structures are identical. No differences found.</div>`;
  }

  const rows = report.differences
    .filter((d) => d.type !== 'MATCH')
    .map((d) => {
      const typeBadgeClass =
        d.type === 'VALUE_MISMATCH'
          ? 'bg-rose-950 text-rose-300 border-rose-800'
          : d.type === 'MISSING_NODE'
          ? 'bg-amber-950 text-amber-300 border-amber-800'
          : 'bg-purple-950 text-purple-300 border-purple-800';

      return `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/40">
        <td class="p-2 font-mono text-[11px] text-slate-300 truncate max-w-xs" title="${d.path}">${d.path}</td>
        <td class="p-2">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono border ${typeBadgeClass}">${d.type}</span>
        </td>
        <td class="p-2 font-mono text-[11px] text-rose-400 bg-rose-950/20">${d.originalValue ?? '-'}</td>
        <td class="p-2 font-mono text-[11px] text-emerald-400 bg-emerald-950/20">${d.amendedValue ?? '-'}</td>
        <td class="p-2 font-mono text-[10px] text-center font-bold ${d.status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}">${d.status}</td>
      </tr>`;
    })
    .join('');

  return `
  <div class="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 text-slate-100 font-mono text-xs">
    <div class="p-2.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
      <span class="font-bold text-indigo-400">XML Diff Comparison Output</span>
      <span class="text-[11px] ${report.status === 'PASS' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}">${report.summaryText}</span>
    </div>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="bg-slate-900/80 text-slate-400 text-[10px] uppercase border-b border-slate-800">
          <th class="p-2">Node Path</th>
          <th class="p-2">Diff Type</th>
          <th class="p-2">Original / Expected</th>
          <th class="p-2">Amended / Actual</th>
          <th class="p-2 text-center">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5" class="p-3 text-center text-slate-400">No node differences found.</td></tr>`}
      </tbody>
    </table>
  </div>`;
}
