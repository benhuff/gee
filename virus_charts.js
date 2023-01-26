// need geojsons for grid (bounds) and ports (polygons)
var viirs = ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG");
print(viirs);
var viirs = viirs.select('avg_rad');
//Map.addLayer(grid);
//Map.centerObject(grid);

Map.addLayer(viirs.max().clip(grid),{bands:'avg_rad',min:0,max:1000,palette:['black','navy','blue','green','lime','yellow','orange','red']},'VIIRS Nightlights',true);

var crs = 'EPSG:4326';
var crsTransform = [0.0041666667,0,-180.00208525335,0,-0.0041666667,75.00208393335001];

var toInt = function(image){
  var radInt = image.cast({'avg_rad':'int'}).rename('rad_int');
  return image.addBands([radInt]);
};

var viirs = viirs.map(toInt).select('rad_int');
print('with int band', viirs)

var mask = viirs.select('rad_int').max().gte(650);
var test = viirs.select('rad_int').max().mask(mask);

var bright = test.reduceToVectors({
  geometry: grid,
  geometryType: 'centroid',
  eightConnected:true,
  crs: crs, 
  crsTransform: crsTransform});

print('Gas Flare Centroids', bright);
Map.addLayer(bright, {color:'red'}, 'Points with Gas Flares', true);

var buff = function(feature){
  return feature.buffer(10000);
};

var flares = bright.map(buff);
print('Buffered Gas Flare Polygons', flares);

var ports = ports.map(buff);
print('Buffered Ports', ports);

Map.addLayer(ports, {color:'blue'}, 'Ports', false);

var index = [0,1,2,3,4,5,6,7,8,9];
var ports = ports.toList(10);
print('TESTING', ports.get(1));
for (var i in index){
  var poly = ee.Feature(ports.get(index[i]));
  var cha = ui.Chart.image.series(viirs, poly, ee.Reducer.sum(), viirs.first().projection().nominalScale(), 'system:time_start').setChartType('LineChart').setOptions({curveType:'function'});
  print('Chart of VIIRS in '+ poly.get('PORT_NAME').getInfo(), cha);
}

var djo = geometry2.buffer(10000);
Map.addLayer(djo);
var djo_lights = ui.Chart.image.series(viirs, djo,ee.Reducer.sum(), viirs.first().projection().nominalScale(), 'system:time_start').setChartType('LineChart').setOptions({curveType:'function'});
print('Chart of VIIRS in Djobouti Port', djo_lights);
/*
Export.table.toDrive({
  collection: bright, 
  description:'Ye_GasFlares', 
  folder:'Yemen', 
  fileFormat: 'KML',
  });
*/

// SEPARATE ANALYSIS
// Filter the VIIRS Monthly Composite image collection for the AOI.
var filter = viirs.filterBounds(table);
print(filter)

// Select the oldest image for timeframe.
var image1 = ee.Image('NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG/20170101')
  .select("avg_rad")
  .clip(table);
Map.addLayer(image1,{min:0,max:60,palette:['000000','FFFFFF']}, 'Image1',false)

// Select the most recent image for timeframe.
var image2 = ee.Image('NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG/20180101')
  .select("avg_rad")
  .clip(table);
Map.addLayer(image2,{min:0,max:60,palette:['000000','FFFFFF']},'Image2',false)

// Take the difference between the most recent and oldest images.
var diff = image2.subtract(image1);

// Select the positive and negative values.
var positive = diff.gte(0);
var negative = diff.lt(0);

// Mask out inverse values.
var decrease = diff.updateMask(positive);
var increase = diff.updateMask(negative);

// Create an image collection from masked images.
var both = ee.ImageCollection([decrease,increase])
print(both)

// Mosaic the images in the collection and add to the map.
var mosaic = both.mosaic()
print(mosaic)

Map.addLayer(mosaic,{min:-40,max:40,palette:['ff3c38','000000','6bf178'],opacity:0.8},'VIIRS Mosaic')

/*
// Map the masked outputs.
Map.addLayer(decrease,{min:0,max:40,palette:['000000','6BF178'],opacity:0.8},'VIIRS Increase')
Map.addLayer(increase,{min:-40,max:0,palette:['FF3C38','000000'],opacity:0.8},'VIIRS Decrease')
*/

// SEPARATE ANALYSIS
var scale = viirs.first().projection().nominalScale();
var crs = 'EPSG:4326';
var crsTransform = [0.0041666667,0,-180.00208525335,0,-0.0041666667,75.00208393335001];
print(viirs)
var viirsCur = viirs.filterDate('2018-01-01','2018-11-30').aside(print);
var viirsRef = viirs.filterDate('2014-01-01','2014-11-30').aside(print);

//----Loop to create monthly mean images----//
var index = [1,2,3,4,5,6,7,8,9,10,11,12];
var meanList = ee.List([]);

for (var i in index){
  var m = index[i];
  var monthCol = viirsRef.filter(ee.Filter.calendarRange(m,m,'month'));
  var meanImg = monthCol.mean().set('month',ee.Number(m).format('%02d'));
  var meanList = meanList.add(meanImg);
}

var meanCol = ee.ImageCollection.fromImages(meanList);
var chart1 = ui.Chart.image.series(meanCol.select('avg_rad'), adm0, ee.Reducer.mean(), scale, 'month')
print(chart1)
print('Value Collection', meanCol);

var maxRad = viirs.select('avg_rad').max();

//----Function to add bands and metadata to each image----//
var addMeta = function(image){
  var startObject = image.get('system:time_start');
  var startDate = ee.Date(startObject);
  var startYear = startDate.get('year').format('%04d');
  var startMonth = startDate.get('month').format('%02d');
  return image.set('month',startMonth).set('year',startYear);
};

var viirsMeta = viirsCur.map(addMeta);
var chart2 = ui.Chart.image.series(viirsMeta.select('avg_rad'), adm0, ee.Reducer.mean(), scale)
print(chart2)
print('Collection w/ Added Metadata',viirsMeta);

//----Function to add anomaly and monthly mean to each image----//
var viirsAnom = viirsMeta.map(function(image){
  var month = ee.Number(image.get('month'));
  var monthMean = meanCol.select('avg_rad').filterMetadata('month','equals',month).first().rename('reference');
  var anomaly = monthMean.subtract(image.select('avg_rad')).rename('difference');
  return image.addBands([anomaly,monthMean]);
});
var chart3 = ui.Chart.image.series(viirsAnom.select('avg_rad','reference','difference'), adm0, ee.Reducer.mean(), scale)
print(chart3)
print('List w/ Anomaly + Value',viirsAnom);

Map.addLayer(viirsAnom.select('difference').mean().clip(adm0),{min:-10,max:10,palette:['red','black','blue']})

Export.image.toDrive({
  image: viirsAnom.select('difference').mean(),
  description: 'VIIRS_Change2014_vs_2018',
  folder: 'Yemen',
  region: adm0,
  crs: crs,
  crsTransform: crsTransform,
});
