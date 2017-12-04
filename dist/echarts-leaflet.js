(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('echarts')) :
	typeof define === 'function' && define.amd ? define(['exports', 'echarts'], factory) :
	(factory((global.leaflet = {}),global.echarts));
}(this, (function (exports,echarts) { 'use strict';

/**
 * constructor for Leaflet CoordSys
 * @param {L.map} map
 * @param {Object} api
 */
function LeafletCoordSys(map, api) {
  this._map = map;
  this.dimensions = ['lng', 'lat'];
  this._mapOffset = [0, 0];
  this._api = api;
  this._projection = L.Projection.Mercator;
}

LeafletCoordSys.prototype.dimensions = ['lng', 'lat'];

LeafletCoordSys.prototype.setZoom = function (zoom) {
  this._zoom = zoom;
};

LeafletCoordSys.prototype.setCenter = function (center) {
  this._center = this._projection.project(new L.LatLng(center[1], center[0]));
};

LeafletCoordSys.prototype.setMapOffset = function (mapOffset) {
  this._mapOffset = mapOffset;
};

LeafletCoordSys.prototype.getLeaflet = function () {
  return this._map;
};

LeafletCoordSys.prototype.dataToPoint = function (data) {
  var point = new L.LatLng(data[1], data[0]);
  var px = this._map.latLngToLayerPoint(point);
  var mapOffset = this._mapOffset;
  return [px.x - mapOffset[0], px.y - mapOffset[1]];
};

LeafletCoordSys.prototype.pointToData = function (pt) {
  var mapOffset = this._mapOffset;
  var coord = this._map.layerPointToLatLng({
    x: pt[0] + mapOffset[0],
    y: pt[1] + mapOffset[1]
  });
  return [coord.lng, coord.lat];
};

LeafletCoordSys.prototype.getViewRect = function () {
  var api = this._api;
  return new echarts.graphic.BoundingRect(0, 0, api.getWidth(), api.getHeight());
};

LeafletCoordSys.prototype.getRoamTransform = function () {
  return echarts.matrix.create();
};

LeafletCoordSys.dimensions = LeafletCoordSys.prototype.dimensions;

L.CustomOverlay = L.Layer.extend({

  initialize: function initialize(container) {
    this._container = container;
  },

  onAdd: function onAdd(map) {
    var pane = map.getPane(this.options.pane);
    pane.appendChild(this._container);

    // Calculate initial position of container with
    // `L.Map.latLngToLayerPoint()`, `getPixelOrigin()
    // and/or `getPixelBounds()`

    // L.DomUtil.setPosition(this._container, point);

    // Add and position children elements if needed

    // map.on('zoomend viewreset', this._update, this);
  },

  onRemove: function onRemove(map) {
    L.DomUtil.remove(this._container);
    // map.off('zoomend viewreset', this._update, this);
  },

  _update: function _update() {
    // Recalculate position of container

    // L.DomUtil.setPosition(this._container, point);

    // Add/remove/reposition children elements if needed
  }
});

LeafletCoordSys.create = function (ecModel, api) {
  var leafletCoordSys = void 0;
  var root = api.getDom();

  // TODO Dispose
  ecModel.eachComponent('leaflet', function (leafletModel) {
    var viewportRoot = api.getZr().painter.getViewportRoot();
    if (typeof L === 'undefined') {
      throw new Error('Leaflet api is not loaded');
    }
    if (leafletCoordSys) {
      throw new Error('Only one leaflet component can exist');
    }
    if (!leafletModel.__map) {
      // Not support IE8
      var mapRoot = root.querySelector('.ec-extension-leaflet');
      if (mapRoot) {
        // Reset viewport left and top, which will be changed
        // in moving handler in LeafletView
        viewportRoot.style.left = '0px';
        viewportRoot.style.top = '0px';
        root.removeChild(mapRoot);
      }
      mapRoot = document.createElement('div');
      mapRoot.style.cssText = 'width:100%;height:100%';
      // Not support IE8
      mapRoot.classList.add('ec-extension-leaflet');
      root.appendChild(mapRoot);
      var _map = leafletModel.__map = L.map(mapRoot);
      var tiles = leafletModel.get('tiles');
      var baseLayers = {};
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = tiles[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var tile = _step.value;

          var tileLayer = L.tileLayer(tile.urlTemplate, tile.options).addTo(_map);
          if (tile.label) baseLayers[tile.label] = tileLayer;
        }
        // add layer control when there are more than two layers
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      if (tiles.length > 1) {
        var layerControlOpts = leafletModel.get('layerControl');
        L.control.layers(baseLayers, {}, layerControlOpts).addTo(_map);
      }
      new L.CustomOverlay(viewportRoot).addTo(_map);
    }
    var map = leafletModel.__map;

    // Set leaflet options
    // centerAndZoom before layout and render
    var center = leafletModel.get('center');
    var zoom = leafletModel.get('zoom');
    if (center && zoom) {
      map.setView([center[1], center[0]], zoom);
    }

    leafletCoordSys = new LeafletCoordSys(map, api);
    leafletCoordSys.setMapOffset(leafletModel.__mapOffset || [0, 0]);
    leafletCoordSys.setZoom(zoom);
    leafletCoordSys.setCenter(center);

    leafletModel.coordinateSystem = leafletCoordSys;
  });

  ecModel.eachSeries(function (seriesModel) {
    if (seriesModel.get('coordinateSystem') === 'leaflet') {
      seriesModel.coordinateSystem = leafletCoordSys;
    }
  });
};

/**
 * compare if two arrays of length 2 are equal
 * @param {Array} a array of length 2
 * @param {Array} b array of length 2
 * @return {Boolean}
 */
function v2Equal(a, b) {
  return a && b && a[0] === b[0] && a[1] === b[1];
}

echarts.extendComponentModel({
  type: 'leaflet',

  getLeaflet: function getLeaflet() {
    // __map is injected when creating LeafletCoordSys
    return this.__map;
  },

  setCenterAndZoom: function setCenterAndZoom(center, zoom) {
    this.option.center = center;
    this.option.zoom = zoom;
  },

  centerOrZoomChanged: function centerOrZoomChanged(center, zoom) {
    var option = this.option;
    return !(v2Equal(center, option.center) && zoom === option.zoom);
  },

  defaultOption: {
    center: [104.114129, 37.550339],
    zoom: 2,
    mapStyle: {},
    roam: false,
    layerControl: {},
    tiles: [{
      urlTemplate: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      }
    }]
  }
});

echarts.extendComponentView({
  type: 'leaflet',

  render: function render(leafletModel, ecModel, api) {
    var rendering = true;

    var leaflet = leafletModel.getLeaflet();
    var viewportRoot = api.getZr().painter.getViewportRoot();
    var coordSys = leafletModel.coordinateSystem;
    var moveHandler = function moveHandler(type, target) {
      if (rendering) {
        return;
      }
      var offsetEl = viewportRoot.parentNode.parentNode;
      // calculate new mapOffset
      var transformStyle = offsetEl.style.transform;
      var dx = 0;
      var dy = 0;
      if (transformStyle) {
        transformStyle = transformStyle.replace('translate3d(', '');
        var parts = transformStyle.split(',');
        dx = -parseInt(parts[0], 10);
        dy = -parseInt(parts[1], 10);
      } else {
        // browsers that don't support transform: matrix
        dx = -parseInt(offsetEl.style.left, 10);
        dy = -parseInt(offsetEl.style.top, 10);
      }
      var mapOffset = [dx, dy];
      viewportRoot.style.left = mapOffset[0] + 'px';
      viewportRoot.style.top = mapOffset[1] + 'px';

      coordSys.setMapOffset(mapOffset);
      leafletModel.__mapOffset = mapOffset;

      api.dispatchAction({
        type: 'leafletRoam'
      });
    };

    /**
     * handler for map zoomEnd event
     */
    function zoomEndHandler() {
      if (rendering) return;
      api.dispatchAction({
        type: 'leafletRoam'
      });
    }

    /**
     * handler for map zoom event
     */
    function zoomHandler() {
      moveHandler();
    }

    leaflet.off('move', this._oldMoveHandler);
    leaflet.off('zoom', this._oldZoomHandler);
    leaflet.off('zoomend', this._oldZoomEndHandler);

    leaflet.on('move', moveHandler);
    leaflet.on('zoom', zoomHandler);
    leaflet.on('zoomend', zoomEndHandler);

    this._oldMoveHandler = moveHandler;
    this._oldZoomEndHandler = zoomHandler;
    this._oldZoomEndHandler = zoomEndHandler;

    var roam = leafletModel.get('roam');
    if (roam && roam !== 'scale') {
      leaflet.dragging.enable();
    } else {
      leaflet.dragging.disable();
    }
    if (roam && roam !== 'move') {
      leaflet.scrollWheelZoom.enable();
      leaflet.doubleClickZoom.enable();
      leaflet.touchZoom.enable();
    } else {
      leaflet.scrollWheelZoom.disable();
      leaflet.doubleClickZoom.disable();
      leaflet.touchZoom.disable();
    }

    rendering = false;
  }
});

/**
 * Leftlet component extension
 */

echarts.registerCoordinateSystem('leaflet', LeafletCoordSys);

echarts.registerAction({
  type: 'leafletRoam',
  event: 'leafletRoam',
  update: 'updateLayout'
}, function (payload, ecModel) {
  ecModel.eachComponent('leaflet', function (leafletModel) {
    var leaflet = leafletModel.getLeaflet();
    var center = leaflet.getCenter();
    leafletModel.setCenterAndZoom([center.lng, center.lat], leaflet.getZoom());
  });
});

var version = '1.0.0';

exports.version = version;

Object.defineProperty(exports, '__esModule', { value: true });

})));
