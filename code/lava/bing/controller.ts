import { ILocation, IArea, IBound } from 'bing';
import { anchorPixel, bound, anchor, fitOptions, area } from './converter';
import { keys, IPoint, partial } from '../type';
import { translate } from 'd3/attr';
import { select, Any } from 'd3-selection';
type Map = Microsoft.Maps.Map;
type Action<T> = (i: T) => void;

interface IMapElement {
    forest  : boolean,
    label   : boolean,
    road    : "color" | "gray" | 'gray_label' | "hidden",
    icon    : boolean,
    area    : boolean,
    building: boolean,
    city    : boolean
}

interface IMapControl {
    type    : 'aerial' | 'road' | 'grayscale' | 'canvasDark' | 'canvasLight',
    lang    : string,
    pan     : boolean,
    zoom    : boolean
}

interface IMapFormat extends IMapControl, IMapElement { }

export function defaultZoom(width: number, height: number): number {
    var min = Math.min(width, height);
    for (var level = 1; level < 20; level++) {
        if (256 * Math.pow(2, level) > min) {
            break;
        }
    }
    return level;
}

export function pixel(map: Microsoft.Maps.Map, loc: ILocation, ref?: Microsoft.Maps.PixelReference) {
    var x = new Microsoft.Maps.Location(loc.latitude, loc.longitude);
    return map.tryLocationToPixel(x, ref) as IPoint;
}

export class MapFormat implements IMapFormat {
    type     = 'road' as 'aerial' | 'road' | 'grayscale' | 'canvasDark' | 'canvasLight';
    lang     = 'default';
    pan      = true;
    zoom     = true;
    city     = false;
    road     = "color" as "color" | "gray" | 'gray_label' | "hidden";
    label    = true;
    forest   = true;
    icon     = false;
    building = false;
    area     = false;
    
    public static build(...fmts: any[]): MapFormat {
        var ret = new MapFormat();
        for (let f of fmts.filter(v => v)) {
            for (var key in ret) {
                key in f && (ret[key] = f[key]);
            }
        }
        return ret;
    }

    public static control<T>(fmt: MapFormat, extra: T): IMapControl & T {
        let result = partial(fmt, ['type', 'lang', 'pan', 'zoom']) as any;
        for (let key in extra) {
            result[key] = extra[key];
        }
        return result;
    }

    public static element<T>(fmt: MapFormat, extra: T): IMapElement & T {
        let result = partial(fmt, ['road', 'forest', 'label', 'city', 'icon', 'building', 'area']) as any;
        for (let key in extra) {
            result[key] = extra[key];
        }
        return result;
    }
}

export function coordinate(map: Microsoft.Maps.Map, pixel: IPoint) {
    var pnt = new Microsoft.Maps.Point(pixel.x, pixel.y);
    return map.tryPixelToLocation(pnt) as ILocation;
}

export var capability = {
    "mapControl": {
        "displayName": "Map control",
        "properties": {
            "type": {
                "displayName": "Type", "type": {
                    "enumeration": [
                        {"displayName": "Aerial", "value": "aerial"},
                        {"displayName": "Color", "value": "road"},
                        {"displayName": "Gray", "value": "grayscale"},
                        {"displayName": "Dark", "value": "canvasDark"},
                        {"displayName": "Light", "value": "canvasLight"}
                    ]
                }
            },
            "lang": {
                "displayName": "Language",
                "description": "The language used in the map",
                "type": {
                    "enumeration": [
                        { "displayName": "Default", "value": "default" },
                        { "displayName": "Chinese", "value": "zh-HK" },
                        { "displayName": "Czech", "value": "cs-CZ" },
                        { "displayName": "Danish", "value": "da-DK" },
                        { "displayName": "Dutch", "value": "nl-NL" },
                        { "displayName": "English", "value": "en-US" },
                        { "displayName": "Finnish", "value": "fi-FI" },
                        { "displayName": "French", "value": "fr-FR" },
                        { "displayName": "German", "value": "de-DE" },
                        { "displayName": "Italian", "value": "it-IT" },
                        { "displayName": "Japanese", "value": "ja-JP" },
                        { "displayName": "Korean", "value": "Ko-KR" },
                        { "displayName": "Norwegian(Bokmal)", "value": "nb-NO" },
                        { "displayName": "Polish", "value": "pl-PL" },
                        { "displayName": "Portuguese", "value": "pt-BR" },
                        { "displayName": "Russian", "value": "ru-RU" },
                        { "displayName": "Spanish", "value": "es-ES" },
                        { "displayName": "Swedish", "value": "sv-SE" }
                    ]
                }
            },
            "pan": { "displayName": "Pan", "type": { "bool": true } },
            "zoom": { "displayName": "Zoom", "type": { "bool": true } }
        }
    },
    "mapElement": {
        "displayName": "Map element",
        "properties": {
            "forest": { "displayName": "Forest", "type": { "bool": true } },
            "road": {
                "displayName": "Road", "type": {
                    "enumeration": [
                        { "displayName": "Default", "value": "color" },
                        { "displayName": "Gray w/ label", "value": "gray_label" },
                        { "displayName": "Gray w/o label", "value": "gray" },
                        { "displayName": "Hidden", "value": "hidden" }
                    ]
                }
            },
            "label": { "displayName": "Label", "type": { "bool": true } },
            "city": { "displayName": "City", "type": { "bool": true } },
            "icon": { "displayName": "Icon", "type": { "bool": true } },
            "building": { "displayName": "Building", "type": { "bool": true } },
            "area": { "displayName": "Area", "type": { "bool": true } }
        }
    }
}

declare var __lavaBuildMap;
function parameter(map: Map, fmt: IMapFormat, div: HTMLDivElement): Microsoft.Maps.IMapLoadOptions {
    var para = {
        credentials: 'Your Bing Key',
        showDashboard: false,
        showTermsLink: false,
        // showScalebar: fmt.scale,
        showLogo: false,
        customMapStyle: customStyle(fmt),
        disablePanning: !fmt.pan,
        disableZooming: !fmt.zoom,
        mapTypeId: mapType(fmt),
        // liteMode: false
    } as Microsoft.Maps.IMapLoadOptions;

    if (map) {
        para.center = map.getCenter();
        para.zoom = map.getZoom()
    }
    else {
        para.center = new Microsoft.Maps.Location(0, 0);
        para.zoom = defaultZoom(div.offsetWidth, div.offsetHeight);
    }
    return para;    
}

function mapType(v: IMapFormat) {
    switch (v.type) {
        case 'aerial'     : return Microsoft.Maps.MapTypeId.aerial;
        case 'road'       : return Microsoft.Maps.MapTypeId.road;
        case 'canvasDark' : return Microsoft.Maps.MapTypeId.canvasDark;
        case 'canvasLight': return Microsoft.Maps.MapTypeId.canvasLight;
        case 'grayscale'  : return Microsoft.Maps.MapTypeId.grayscale;
    }
}

function customStyle(v: IMapFormat): Microsoft.Maps.ICustomMapStyle {
    var nothing = { labelVisible: false, visible: false };
    var visible = { visible: true, labelVisible: v.label };
    var result = {
        version: "1.0",
        elements: {
            highSpeedRamp: nothing,
            ramp: nothing,
            unpavedStreet: nothing,
            tollRoad: nothing,
            trail: nothing
        }
    } as Microsoft.Maps.ICustomMapStyle;
    if (!v.building) {
        result.elements.structure = { visible: false };
        result.elements.building = { visible: false };
    }
    result.elements.mapElement = { labelVisible: v.label };
    result.elements.political = { labelVisible: v.label, visible: true };
    result.elements.district = { labelVisible: v.label, visible: true };
    if (v.road === 'gray' || v.road === 'gray_label') {
        result.elements.transportation = {
            visible: true,
            labelVisible: v.road === 'gray_label',
            fillColor: '#DDDDDD',
            strokeColor: '#AAAAAA',
            labelOutlineColor: '#EEEEEE'
        } as Microsoft.Maps.IMapElementStyle;
        result.elements.street = {
            visible: true,
            labelVisible: v.road === 'gray_label',
            fillColor: "#EEEEEE",
            strokeColor: "#DDDDDD",
            labelOutlineColor: '#DDDDDD'
        } as Microsoft.Maps.IMapElementStyle;
    }
    else if (v.road === 'hidden') {
        result.elements.transportation = nothing;
    }
    result.elements.point = v.icon ? visible : nothing;
    result.elements.vegetation = v.forest ? visible : nothing;
    result.elements.populatedPlace = { labelVisible: v.city, visible: v.icon };
    result.elements.area = v.area ? visible : nothing;
    return result;
}

export interface IListener {
    transform?(map: Microsoft.Maps.Map, pzoom: number, end?: boolean);
    resize?(map: Microsoft.Maps.Map);
}

export class Controller {
    private _div: HTMLDivElement;
    private _map: Map;
    private _fmt: IMapFormat;

    public get map() {
        return this._map;
    }

    public get format() {
        return this._fmt;
    }

    private _svg: Any;
    private _svgroot: Any;
    public get svg() {
        return this._svgroot;
    }
    private _canvas: Any;
    public get canvas() {
        return this._canvas;
    }

    public location(p: IPoint): ILocation {
        let pnt = new Microsoft.Maps.Point(p.x, p.y);
        return this._map.tryPixelToLocation(pnt) as ILocation;
    }

    public pixel(loc: ILocation | IBound, ref?: Microsoft.Maps.PixelReference): IPoint {
        if ((loc as IBound).anchor) {
            return anchorPixel(this._map, loc as any);
        }
        else {
            return pixel(this._map, loc as any, ref);
        }
    }

    public anchor(locs: ILocation[]) {
        return anchor(locs);
    }

    public area(locs: ILocation[], level = 20) {
        return area(locs, level);
    }

    public bound(locs: ILocation[]): IBound {
        return bound(locs);
    }
   
    // private _layer: ILayer;
    private _listener =[] as IListener[];
    public add(v: IListener) {
        this._listener.push(v);
    }

    // public layer(v?: ILayer): ILayer {
    //     return null;
    //     // if (v === undefined) {
    //     //     return this._layer;
    //     // }
    //     // if (this._layer) {
    //     //     console.log('lava: a layer is already set');
    //     // }            
    //     // this._layer = v;
    //     // this._map && this._layer.reset(this._map);
    //     // return this._layer;
    // }

    public fitView(areas: IBound[]) {
        var width = this._map.getWidth(), height = this._map.getHeight();
        this._map.setView(fitOptions(areas, { width, height }));
        this._viewChange(false);
    }

    constructor(div: HTMLDivElement) {
        this._fmt = {} as IMapFormat;
        this._div = div;
        let config = (root: d3.Any) => {
            root.att.tabIndex(-1).sty.pointer_events('none')
                .sty.position('absolute').sty.visibility('inherit')
                .sty.user_select('none');
            return root;
        };
        this._canvas = config(select(div).append('canvas'));
        this._svg = config(select(div).append('svg'));
        this._svgroot = this._svg.append('g').att.id('root');
        __lavaBuildMap = () => {
            // console.log('begin lava build map');
            var n = window['InstrumentationBase'];
            n.prototype.flush = function () {
                if (n._timerToken) {
                    window.clearTimeout(n._timerToken), n._timerToken = 0;
                }
                if (n.logList.length) {
                    this.clear();
                }
            };
            this._remap();
            this._then && this._then(this._map);
            this._then = null;
            // console.log('done lava build map');
        }
    }
    
    private _remap(): Map {
        var setting = parameter(this._map, this._fmt, this._div);
        select(this._div).select('div').remove();
        let map = new Microsoft.Maps.Map(this._div, setting);
        let Events = Microsoft.Maps.Events;
        if (this._map && this._handler1) {
            Events.removeHandler(this._handler1);
            Events.removeHandler(this._handler2);
            Events.removeHandler(this._handler3);
        }
        map.getRootElement().appendChild(this._canvas.node());
        map.getRootElement().appendChild(this._svg.node());
        if (!this._map) {//only for the first time, call resize
            this._map = map;
            this._resize();
        }
        else {
            this._map = map;
        }
        this._handler1 = Events.addHandler(map, 'viewchange', () => this._viewChange(false));
        this._handler2 = Events.addHandler(map, 'viewchangeend', () => this._viewChange(true));
        this._handler3 = Events.addHandler(map, 'mapresize', () => this._resize());
        return map;
    }
    private _handler1: Microsoft.Maps.IHandlerId;
    private _handler2: Microsoft.Maps.IHandlerId;
    private _handler3: Microsoft.Maps.IHandlerId;

    private _viewChange(end = false) {
        let zoom = this._map.getZoom();
        for (let l of this._listener) {
            l.transform && l.transform(this._map, this._zoom, end);
        }
        this._zoom = zoom;
    }

    private _zoom: number;

    private _resize(): void {
        if (!this._map) {
            return;
        }
        let w = this._map.getWidth(), h = this._map.getHeight();
        this._svg.att.width(w).att.height(h);
        this._canvas.att.width(w).att.height(h);
        this._svgroot.att.transform(translate(w / 2, h / 2));
        for (let l of this._listener) {
            l.resize && l.resize(this._map);
        }
    }

    private _then: Action<Map>;
    restyle(fmt: Partial<IMapFormat>, then?: Action<Map>) {
        then = then || (() => { });
        var dirty = {} as Partial<IMapFormat>;
        for (var k in fmt) {
            if (fmt[k] !== this._fmt[k]) {
                dirty[k] = this._fmt[k] = fmt[k];
            }
        }
        if (keys(dirty).length === 0){
            return;
        }
        if ('lang' in dirty || !this._map) {
            select('#mapscript').remove();
            select('head').selectAll('link').filter(function () {
                var src = select(this).attr('href') as string;
                return src && src.indexOf('www.bing.com') > 0;
            }).remove();
            select('head').selectAll('script').filter(function () {
                var src = select(this).attr('src') as string;
                return src && src.indexOf('www.bing.com') > 0;
            }).remove();

            let script = document.createElement('script');
            script.type = 'text/javascript';
            script.id = 'mapscript';
            script.src = "https://www.bing.com/api/maps/mapcontrol?callback=__lavaBuildMap";
            if (dirty.lang !== 'default') {
                script.src += "&setLang=" + dirty.lang;
            }
            script.async = true;
            script.defer = true;
            this._then = then;
            document.body.appendChild(script);
            return;
        }
        var remap = { label: 1, forest: 1, road: 1, city: 1, icon: 1, area: 1, building: 1 };
        for (var k in dirty) {
            if (k in remap) {
                setTimeout(() => then(this._remap()), 0);
                return;
            }
        }
        var options = {} as Microsoft.Maps.IMapOptions;

        if ('pan' in dirty) {
            options.disablePanning = !dirty.pan;
        }
        if ('zoom' in dirty) {
            options.disableZooming = !dirty.zoom;
        }
        if ('type' in dirty) {
            setTimeout(() => this._map.setView({ mapTypeId: mapType(this._fmt) }), 0);
        }
        if (Object.keys(options).length) {
            setTimeout(() => this._map.setOptions(options), 0);
        }
        then(null);
        return;
    }
}
