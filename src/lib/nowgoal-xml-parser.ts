/**
 * NowGoal XML Parser - TES-NGWS-001.3a
 * 
 * XML parsing using fast-xml-parser with rg-compatible logging.
 * 
 * @module src/lib/nowgoal-xml-parser
 */

import { XMLParser } from "fast-xml-parser";
import { NowGoalTick } from "../models/nowgoal-tick.ts";
import { transformToNowGoalTick } from "./transform-nowgoal.ts";
import { getTESDomainConfigCached } from "../config/tes-domain-config.ts";

/**
 * XML Parser instance with optimized configuration
 */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: true,
  trimValues: true,
  parseTrueNumberOnly: false,
});

/**
 * Log header with rg-compatible metadata enrichment
 */
function logHeadersForRg(rgBlock: string): void {
  const logLine = `${new Date().toISOString()} ${rgBlock}\n`;
  Bun.write('logs/headers-index.log', logLine, { createPath: true, flag: 'a' }).catch((error) => {
    console.error(`[NowGoal XML Parser] Failed to write rg log: ${error}`);
  });
}

/**
 * Serialize metadata for rg format
 */
function serializeForRg(metadata: {
  scope: string;
  domain: string;
  type: string;
  meta: string;
  version: string;
  ticket: string;
  bunApi: string;
  ref: string;
}): string {
  const timestamp = Date.now();
  return `{${metadata.meta}}~[${metadata.scope}][${metadata.domain}][${metadata.type}][${metadata.meta}][${metadata.version}][${metadata.ticket}][${metadata.bunApi}][#REF:${metadata.ref}][TIMESTAMP:${timestamp}]`;
}

/**
 * Parse NowGoal XML message
 * 
 * TES-NGWS-001.3a: Install & Integrate XML Parser
 * 
 * @param xml - XML string to parse
 * @param rgMetadata - Optional RG metadata from previous step
 * @returns Parsed and transformed NowGoalTick
 */
export function parseNowGoalXml(xml: string, rgMetadata?: string): NowGoalTick {
  const start = Bun.nanoseconds();
  const tesConfig = getTESDomainConfigCached();
  
  try {
    // Parse XML
    const data = parser.parse(xml);
    
    // Calculate processing time
    const processingNs = Bun.nanoseconds() - start;
    const processingMs = processingNs / 1_000_000;
    
    // Log successful parse with performance metadata
    const rgBlock = `[HEADERS_BLOCK_START:v1]${serializeForRg({
      scope: "PARSE",
      domain: tesConfig.nowgoalDomain,
      type: "DATA",
      meta: "XML_PARSE_SUCCESS",
      version: "FAST-XML-V4",
      ticket: "TES-NGWS-001.3a",
      bunApi: "fast-xml-parser",
      ref: "https://github.com/NaturalIntelligence/fast-xml-parser"
    })}|processingNs:${processingNs}|processingMs:${processingMs.toFixed(2)}[HEADERS_BLOCK_END]`;
    
    logHeadersForRg(rgBlock);
    
    // Console log matching expected format
    console.log(`[XML_PARSE] Parsed in ${processingMs.toFixed(2)}ms`);
    
    // Transform to NowGoalTick
    const tick = transformToNowGoalTick(data, rgBlock);
    
    return tick;
  } catch (error) {
    // Log parse failure with error context
    const rgBlock = `[HEADERS_BLOCK_START:v1]{error:${error instanceof Error ? error.message : String(error)}}~[PARSE][${tesConfig.nowgoalDomain}][ERROR][XML_PARSE_FAILURE][FAST-XML-V4][TES-NGWS-001.3a][fast-xml-parser][#REF:${xml.substring(0, 100)} ][TIMESTAMP:${Date.now()}][HEADERS_BLOCK_END]`;
    
    logHeadersForRg(rgBlock);
    
    throw new Error(`XML parsing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

