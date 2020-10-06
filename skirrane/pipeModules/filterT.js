module.exports.filterT = (data) => {
  let filteredData = {data: []};
  for (const o of data.data) {
    if (o.label.toLowerCase().includes('star')) {
      filteredData.data.push(o);
    }
  }
  return filteredData;
};
