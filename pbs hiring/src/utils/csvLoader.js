export const loadTrainingDataFromCSV = async (csvContent) => {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const record = {};
    
    headers.forEach((header, index) => {
      const value = values[index];
      // Convert numeric fields
      if (['assessment', 'experience', 'exam', 'interview', 'score'].includes(header.toLowerCase())) {
        record[header.toLowerCase()] = parseFloat(value) || 0;
      } else {
        record[header.toLowerCase()] = value;
      }
    });
    
    return record;
  });
};

export const loadCSVFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};