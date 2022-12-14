/*
 * Mapkick.js
 * Create beautiful, interactive maps with one line of JavaScript
 * https://github.com/ankane/mapkick.js
 * v0.1.1
 * MIT License
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Mapkick = factory());
}(this, (function () { 'use strict';

	/*
	object-assign
	(c) Sindre Sorhus
	@license MIT
	*/
	/* eslint-disable no-unused-vars */
	var getOwnPropertySymbols = Object.getOwnPropertySymbols;
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	var propIsEnumerable = Object.prototype.propertyIsEnumerable;

	function toObject(val) {
		if (val === null || val === undefined) {
			throw new TypeError('Object.assign cannot be called with null or undefined');
		}

		return Object(val);
	}

	function shouldUseNative() {
		try {
			if (!Object.assign) {
				return false;
			}

			// Detect buggy property enumeration order in older V8 versions.

			// https://bugs.chromium.org/p/v8/issues/detail?id=4118
			var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
			test1[5] = 'de';
			if (Object.getOwnPropertyNames(test1)[0] === '5') {
				return false;
			}

			// https://bugs.chromium.org/p/v8/issues/detail?id=3056
			var test2 = {};
			for (var i = 0; i < 10; i++) {
				test2['_' + String.fromCharCode(i)] = i;
			}
			var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
				return test2[n];
			});
			if (order2.join('') !== '0123456789') {
				return false;
			}

			// https://bugs.chromium.org/p/v8/issues/detail?id=3056
			var test3 = {};
			'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
				test3[letter] = letter;
			});
			if (Object.keys(Object.assign({}, test3)).join('') !==
					'abcdefghijklmnopqrst') {
				return false;
			}

			return true;
		} catch (err) {
			// We don't expect any of the above to throw, but better to be safe.
			return false;
		}
	}

	var objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
		var arguments$1 = arguments;

		var from;
		var to = toObject(target);
		var symbols;

		for (var s = 1; s < arguments.length; s++) {
			from = Object(arguments$1[s]);

			for (var key in from) {
				if (hasOwnProperty.call(from, key)) {
					to[key] = from[key];
				}
			}

			if (getOwnPropertySymbols) {
				symbols = getOwnPropertySymbols(from);
				for (var i = 0; i < symbols.length; i++) {
					if (propIsEnumerable.call(from, symbols[i])) {
						to[symbols[i]] = from[symbols[i]];
					}
				}
			}
		}

		return to;
	};

	var index = {
	  Map: function (element, data, options) {
	    var map;
	    var trails = {};
	    var groupedData = {};
	    var timestamps = [];
	    var timeIndex = 0;
	    var bounds;

	    function getJSON(element, url, success) {
	      ajaxCall(url, success, function (jqXHR, textStatus, errorThrown) {
	        var message = (typeof errorThrown === "string") ? errorThrown : errorThrown.message;
	        // TODO show message
	        console.log("ERROR: " + message);
	      });
	    }

	    function ajaxCall(url, success, error) {
	      var $ = window.jQuery || window.Zepto || window.$;

	      if ($) {
	        $.ajax({
	          dataType: "json",
	          url: url,
	          success: success,
	          error: error
	        });
	      } else {
	        var xhr = new XMLHttpRequest();
	        xhr.open("GET", url, true);
	        xhr.setRequestHeader("Content-Type", "application/json");
	        xhr.onload = function () {
	          if (xhr.status === 200) {
	            success(JSON.parse(xhr.responseText), xhr.statusText, xhr);
	          } else {
	            error(xhr, "error", xhr.statusText);
	          }
	        };
	        xhr.send();
	      }
	    }

	    function onMapLoad(callback) {
	      if (map.loaded()) {
	        callback();
	      } else {
	        map.on("load", callback);
	      }
	    }

	    function toTimestamp(ts) {
	      if (typeof ts === "number") {
	        return ts;
	      } else {
	        return (new Date(ts)).getTime() / 1000;
	      }
	    }

	    function generateReplayMap(element, data, options) {
	      // group data
	      var i;
	      for (i = 0; i < data.length; i++) {
	        var row = data[i];
	        var ts = toTimestamp(row.time);
	        if (ts) {
	          if (!groupedData[ts]) {
	            groupedData[ts] = [];
	          }
	          groupedData[ts].push(row);
	          bounds.extend(rowCoordinates(row));
	        }
	      }

	      for (i in groupedData) {
	        if (groupedData.hasOwnProperty(i)) {
	          timestamps.push(parseInt(i));
	        }
	      }
	      timestamps.sort();

	      // create map
	      generateMap(element, groupedData[timestamps[timeIndex]], options);

	      onMapLoad( function () {
	        setTimeout(function () {
	          nextFrame(element, options);
	        }, 100);
	      });
	    }

	    function nextFrame(element, options) {
	      timeIndex++;

	      updateMap(element, groupedData[timestamps[timeIndex]], options);

	      if (timeIndex < timestamps.length - 1) {
	        setTimeout(function () {
	          nextFrame(element, options);
	        }, 100);
	      }
	    }

	    function fetchData(element, data, options, callback) {
	      if (typeof data === "string") {
	        getJSON(element, data, function (newData, status, xhr) {
	          callback(element, newData, options);
	        });
	      } else if (typeof data === "function") {
	        data( function (newData) {
	          callback(element, newData, options);
	        });
	      } else {
	        callback(element, data, options);
	      }
	    }

	    function updateMap(element, data, options) {
	      onLayersReady( function () {
	        if (options.trail) {
	          recordTrails(data, options.trail);
	          map.getSource("trails").setData(generateTrailsGeoJSON(data));
	        }
	        map.getSource("objects").setData(generateGeoJSON(data, options));
	      });
	    }

	    function generateGeoJSON(data, options) {
	      var geojson = {
	        type: "FeatureCollection",
	        features: []
	      };

	      var i;
	      for (i = 0; i < data.length; i++) {
	        var row = data[i];
	        var properties = objectAssign({icon: options.defaultIcon || "mapkick"}, row);
	        geojson.features.push({
	          type: "Feature",
	          geometry: {
	            type: "Point",
	            coordinates: rowCoordinates(row),
	          },
	          properties: properties
	        });
	      }

	      return geojson;
	    }

	    function rowCoordinates(row) {
	      return [row.longitude || row.lng || row.lon, row.latitude || row.lat];
	    }

	    function trailId(row) {
	      return row.id;
	    }

	    function recordTrails(data, trailOptions) {
	      for (var i = 0; i < data.length; i++) {
	        var row = data[i];
	        var trail_id = trailId(row);
	        if (!trails[trail_id]) {
	          trails[trail_id] = [];
	        }
	        trails[trail_id].push(rowCoordinates(row));
	        if (trailOptions && trailOptions.len && trails[trail_id].length > trailOptions.len) {
	          trails[trail_id].shift();
	        }
	      }
	    }

	    function generateTrailsGeoJSON(data) {
	      var geojson = {
	        type: "FeatureCollection",
	        features: []
	      };

	      for (var i = 0; i < data.length; i++) {
	        var row = data[i];
	        geojson.features.push({
	          type: "Feature",
	          geometry: {
	            type: "LineString",
	            coordinates: trails[trailId(row)]
	          }
	        });
	      }

	      return geojson;
	    }

	    function addLayer(name, geojson) {
	      map.addSource(name, {
	        type: "geojson",
	        data: geojson
	      });

	      map.addLayer({
	        id: name,
	        source: name,
	        type: "symbol",
	        layout: {
	          "icon-image": "{icon}-15",
	          "icon-allow-overlap": true,
	          "text-field": "{label}",
	          "text-size": 11,
	          "text-anchor": "top",
	          "text-offset": [0, 1],
	          "text-allow-overlap": true
	        }
	      });

	      // Create a popup, but don't add it to the map yet.
	      var popup = new mapboxgl.Popup({
	          closeButton: false,
	          closeOnClick: false
	      });

	      map.on("mouseenter", name, function(e) {
	        if (e.features[0].properties.tooltip) {
	          // Change the cursor style as a UI indicator.
	          map.getCanvas().style.cursor = "pointer";

	          popup.options.offset = e.features[0].properties.icon === "mapkick" ? 40 : 14;

	          // Populate the popup and set its coordinates
	          // based on the feature found.
	          popup.setLngLat(e.features[0].geometry.coordinates)
	            .setText(e.features[0].properties.tooltip)
	            .addTo(map);

	          // fix blurriness for non-retina screens
	          // https://github.com/mapbox/mapbox-gl-js/pull/3258
	          if (popup._container.offsetWidth % 2 !== 0) {
	            popup._container.style.width = popup._container.offsetWidth + 1 + "px";
	          }
	        }
	      });

	      map.on("mouseleave", name, function() {
	        map.getCanvas().style.cursor = "";
	        popup.remove();
	      });
	    }

	    function generateMap(element, data, options) {
	      var geojson = generateGeoJSON(data, options);
	      options = options || {};

	      for (var i = 0; i < geojson.features.length; i++) {
	        bounds.extend(geojson.features[i].geometry.coordinates);
	      }

	      map = new window.mapboxgl.Map({
	          container: element,
	          style: options.style || "mapbox://styles/mapbox/streets-v9",
	          dragRotate: false,
	          touchZoomRotate: false,
	          center: options.center || bounds.getCenter(),
	          zoom: options.zoom || 15
	      });

	      if (options.controls) {
	        map.addControl(new mapboxgl.NavigationControl({showCompass: false}));
	      }

	      if (!options.zoom) {
	        // hack to prevent error
	        if (!map.style.stylesheet) {
	          map.style.stylesheet = {};
	        }
	        map.fitBounds(bounds, {padding: 40, animate: false, maxZoom: 15});
	      }

	      onMapLoad( function () {
	        if (options.trail) {
	          recordTrails(data);

	          map.addSource("trails", {
	            type: "geojson",
	            data: generateTrailsGeoJSON([])
	          });

	          map.addLayer({
	            id: "trails",
	            source: "trails",
	            type: "line",
	            layout: {
	              "line-join": "round",
	              "line-cap": "round"
	            },
	            paint: {
	              "line-color": "#888",
	              "line-width": 2
	            }
	          });
	        }

	        // TODO only load marker when needed
	        // TODO allow other colors and sizes
	        map.loadImage("https://a.tiles.mapbox.com/v4/marker/pin-m+f86767.png?access_token=" + window.mapboxgl.accessToken, function(error, image) {
	          map.addImage("mapkick-15", image);

	          addLayer("objects", geojson);

	          layersReady = true;
	          var cb;
	          while ((cb = layersReadyQueue.shift())) {
	            cb();
	          }
	        });
	      });
	    }

	    var layersReady = false;
	    var layersReadyQueue = [];
	    function onLayersReady(callback) {
	      if (layersReady) {
	        callback();
	      } else {
	        layersReadyQueue.push(callback);
	      }
	    }

	    // main

	    options = options || {};
	    bounds = new window.mapboxgl.LngLatBounds();

	    if (options.replay) {
	      fetchData(element, data, options, generateReplayMap);
	    } else {
	      fetchData(element, data, options, generateMap);

	      if (options.refresh) {
	        setInterval( function () {
	          fetchData(element, data, options, updateMap);
	        }, options.refresh * 1000);
	      }
	    }
	  }
	};

	return index;

})));