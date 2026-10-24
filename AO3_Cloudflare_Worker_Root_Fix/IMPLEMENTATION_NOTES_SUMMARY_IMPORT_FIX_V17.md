# AO3 Summary extraction and Korean memo integration (v17)

- Added robust AO3 Summary extraction across known `.summary` wrappers and heading-based HTML fallbacks; meta descriptions are only used as a last resort when they look like prose.
- Merges metadata from successful extraction candidates so a proxy returning complete chapter content but incomplete metadata no longer discards a Summary found by another candidate.
- When Summary is absent from a chapter response, tries a targeted `/works/ID` metadata fallback using AllOrigins and Jina.
- Translates Summary paragraphs through the existing translation provider pipeline in small batches instead of one request per paragraph. English source is never silently inserted into the memo on failure.
- Added explicit extraction/translation status messages to the AO3 import log.
- When appending chapters to an existing work, fills a blank memo with translated Summary, or replaces only a memo exactly matching previously imported raw English Summary; user-written notes are preserved.
