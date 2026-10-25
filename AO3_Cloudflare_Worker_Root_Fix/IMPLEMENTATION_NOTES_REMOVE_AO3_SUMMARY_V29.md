# Remove AO3 Summary discovery (v29)

- Disabled AO3 Summary block detection in HTML and Jina Markdown import paths.
- Removed the extra metadata-only fallback requests that were sent only to locate Summary.
- Removed AO3 Summary translation from the import pipeline and the related missing-summary status log.
- AO3 importing still retrieves title, author, fandom, and chapter text.
- User-authored summary/memo fields in the bookshelf remain available. Appending chapters no longer modifies an existing memo.
- All four full HTML entry points were kept identical.
