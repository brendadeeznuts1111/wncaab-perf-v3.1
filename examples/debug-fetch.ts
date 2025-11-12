#!/usr/bin/env bun

/**
 * Example: Debug Fetch Requests
 * 
 * Demonstrates Bun's verbose fetch logging feature.
 * Shows how to enable curl output programmatically.
 * 
 * Bun prints fetch requests as **single-line curl commands** that can be
 * copy-pasted directly into your terminal to replicate the request.
 * 
 * Usage:
 *   bun run examples/debug-fetch.ts
 * 
 * Or with environment variable:
 *   BUN_CONFIG_VERBOSE_FETCH=curl bun run examples/debug-fetch.ts
 */

// Method 1: Set programmatically (as shown in Bun docs)
process.env.BUN_CONFIG_VERBOSE_FETCH = "curl";

// Method 2: Import utility helper
// import { enableVerboseFetch } from '../lib/fetch-debug.ts';
// enableVerboseFetch('curl');

console.log('Making fetch request with verbose logging enabled...\n');
console.log('The request will be printed as a single-line curl command you can copy-paste.\n');

// Make a POST request - it will be logged as a single-line curl command
const response = await fetch("https://example.com", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ foo: "bar" }),
});

console.log(`\nResponse status: ${response.status}`);
console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

// Example output (exact format from Bun):
// [fetch] $ curl --http1.1 "https://example.com/" -X POST -H "content-type: application/json" -H "Connection: keep-alive" -H "User-Agent: Bun/1.3.2" -H "Accept: */*" -H "Host: example.com" -H "Accept-Encoding: gzip, deflate, br" --compressed -H "Content-Length: 13" --data-raw "{\"foo\":\"bar\"}"
//
// [fetch] > HTTP/1.1 POST https://example.com/          (Request from your local code)
// [fetch] > content-type: application/json
// [fetch] > Connection: keep-alive
// [fetch] > User-Agent: Bun/1.3.2
// [fetch] > Accept: */*
// [fetch] > Host: example.com
// [fetch] > Accept-Encoding: gzip, deflate, br
// [fetch] > Content-Length: 13
//
// [fetch] < 200 OK                                       (Response from remote server)
// [fetch] < Accept-Ranges: bytes
// [fetch] < Cache-Control: max-age=604800
// [fetch] < Content-Type: text/html; charset=UTF-8
// [fetch] < Date: Tue, 18 Jun 2024 05:12:07 GMT
// [fetch] < Etag: "3147526947"
// [fetch] < Expires: Tue, 25 Jun 2024 05:12:07 GMT
// [fetch] < Last-Modified: Thu, 17 Oct 2019 07:18:26 GMT
// [fetch] < Server: EOS (vny/044F)
// [fetch] < Content-Length: 1256
//
// Note: The [fetch] $ line is a single-line curl command ready to copy-paste!
//       Lines with [fetch] > are requests from your local code (outgoing).
//       Lines with [fetch] < are responses from the remote server (incoming).


