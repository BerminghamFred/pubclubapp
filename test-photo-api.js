// Test script to verify photo API is working
const photoName = "places/ChIJg-M6qNHhdUgRvqvNsEqoB-4/photos/AciIO2fxkXA7wmJzW3Ca3D6NQbSknZmXUHefZt2CxlGwZADswDKSd5GjQbTUQZXfA-A2kwYKTq6xhCKfEPK_FHvrr2w97fJNaOymWov41VmFU39e456XMXXiUsM3MTUfhxA7BE6sKycsf0OMJVs86GDnJD3vcc2ZQO_0EEcLiFLmXWDQPGpDfLTPjej4fsQu7kdgH2FI_Nptsyn89vvHOCWLkB6AxGozj7etKzvXUM53yds2Hhv4w_FHwZpBWVT6K0wntB9zzn-T3u48GbMLvdYRckv05U27gz6Bld-F1Fbj-CZtWg";
const placeId = "ChIJg-M6qNHhdUgRvqvNsEqoB-4";

console.log("Testing photo API...");
console.log("\n1. Test with photo_name:");
console.log(`   curl "http://localhost:3000/api/photo-by-place?photo_name=${encodeURIComponent(photoName)}&w=480" -I`);

console.log("\n2. Test with place_id:");
console.log(`   curl "http://localhost:3000/api/photo-by-place?place_id=${placeId}&w=480" -I`);

console.log("\n\nRun these commands in PowerShell:");
console.log(`\nInvoke-WebRequest -Uri "http://localhost:3000/api/photo-by-place?photo_name=${encodeURIComponent(photoName)}&w=480" -Method HEAD`);
console.log(`\nInvoke-WebRequest -Uri "http://localhost:3000/api/photo-by-place?place_id=${placeId}&w=480" -Method HEAD`);

