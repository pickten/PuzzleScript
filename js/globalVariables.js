var unitTesting=false;
//var curlevel=0;
//var savelevel=0;
var curlevelTarget=null;
var hasUsedCheckpoint=false;
var levelEditorOpened=false;
var muted=0;
// todo: remove all capital letters!
var g0 = {curlevel:0, savelevel:0, restartTarget:null, saveTarget:null, lastWin:'', condstack: [], condvalstack: []};
var g = {};
// TODO: stacks
//var gtyp = {curlevel: 0, savelevel:[''], restartTarget: ['level'], saveTarget: ['level'], lastWin: ['string']};

function matchVals(s, t) {
    // TODO: better.
    if(t === undefined) {
        switch(typeof s) {
        case typeof(undefined): {
            return true;
            break;
        }
        case typeof(1): {
            return s === 0;
            break;
        }
        case typeof(''): {
            return s === '';
            break;
        }
        case typeof(true): {
            return !s;
            break;
        }
        default: {
            return false;
            break;
        }
        }
    }
    if(s === undefined) {
        return matchVals(t,s);
    }
    return (typeof s === typeof t) && (JSON.stringify(s) === JSON.stringify(t));
}

var consts = {
    '+' : function(xs) {return xs.reduce(function(acc, cur){return acc + cur;});},
    '-' : function(xs) {return xs.reduce(function(acc, cur){return acc - cur;});},
    '*' : function(xs) {return xs.reduce(function(acc, cur){return acc * cur;});},
    '/' : function(xs) {return xs.reduce(function(acc, cur){return acc / cur;});},
    'and' : function(xs) {return xs.reduce(function(acc, cur){return acc && cur;});},
    'or' : function(xs) {return xs.reduce(function(acc, cur){return acc || cur;});},
    'xor' : function(xs) {return xs.reduce(function(acc, cur){return acc ^ cur;});},
    'not' : function(xs) {return xs.reduce(function(acc, cur){return acc ^ cur;}, true);},
    '>' : function(xs) {return xs.reduce(function(acc, cur){return acc > cur;});},
    '<' : function(xs) {return xs.reduce(function(acc, cur){return acc < cur;});},
    '=' : function(xs) {return xs.reduce(matchVals);},
    'array' : function(xs) {return xs;},
    'lit' : function(xs) {return xs[0];},
    'def' : function(xs) {
        // [def | a | b | ... | v] [get | a | b | ... ] -> v v
        var o = scopeOfVariable(xs[0]);
        for(var i = 0; i < xs.length-3 && o.propertyIsEnumerable(xs[i]); i++) {
            o = o[xs[i]];
        }
        console.log('def ', xs);
        o[xs[xs.length-2]] = xs[xs.length-1]; return xs[xs.length-1];
    },
    'let' : function(xs) {
        // [def | a | b | ... | v] [get | a | b | ... ] -> v v
        var o = scopeOfVariable(xs[0], true);
        for(var i = 0; i < xs.length-3 && o.propertyIsEnumerable(xs[i]); i++) {
            if(o[xs[i]] === undefined) {
                o[xs[i]] = {};
            }
            o = o[xs[i]];
        }
        console.log('def ', xs);
        o[xs[xs.length-2]] = xs[xs.length-1]; return xs[xs.length-1];
    },
    'get' : function(xs) {
        return xs.reduce(function(acc, cur){
            return (acc === undefined || !acc.propertyIsEnumerable(cur)) ? acc : acc[cur];
        }, scopeOfVariable(xs[0]));
    },
    'true' : function() {return true;},
    'false' : function() {return false;},
    'levelid' : function(xs) {return getLevelID(xs[0]);},
    'section' : function(xs) {return getSectionAndOffset(xs.length > 0 ? xs[0] : g.curlevel);},
    '+level' : function(xs) {
        return getLevelID(xs.reduce(function(acc, cur) {
            return getNLevelsLater(getLevelID(acc), typeof cur === typeof '' ? parseInt(cur) : cur);
        }));
    },
    'beatlevel' : function(xs) {
        var l = firstLevelFrom(consts['+level'](xs));
        var w = (g._beatlevel === undefined ? undefined : g._beatlevel[l]);
        return (w !== undefined) && w.length > 0;
    },
    'beatlevelby' : function(xs) {
        var ww = xs.shift();
        var l = firstLevelFrom(consts['+level'](xs));
        var w = g._beatlevel[l];
        return (w !== undefined) && w.indexOf(ww) > -1;
    },
    'if' : function(xs) {
        return xs[0] ? xs[1] : xs[2];
    },
    'map' : function(xs) {
        var v = xs.pop();
        return v.map(function(vv) {return computeBracketed(xs.concat([vv]));});
    },
    'maparr' : function(xs) {
        var f = xs.shift();
        return xs.map(function(v) {return computeBracketed([].concat(f).concat(v));});
    },
};

function parseLevel(curlevelTarg) {
//    var curlevelTarg = JSON.parse(backupStr);
    
    var arr = [];
    for(var p in Object.keys(curlevelTarg.dat)) {
        arr[p] = curlevelTarg.dat[p];
    }
    curlevelTarg.dat = new Int32Array(arr);
    return curlevelTarg;
}

function newgame() {
    g = {};
    for(var i in g0) {
        g[i] = g0[i];
    }
}
function doSetupTitleScreenLevelContinue(){
    try {
        if (!!window.localStorage) { 
            if (localStorage[document.URL]!==undefined) {
                var ng = JSON.parse(localStorage[document.URL]);
                if(typeof ng === typeof g) {
                    g = ng;
                    if(localStorage[document.URL+'_typ'] !==undefined) {
                        //gtyp = JSON.parse(localStorage[document.URL+'_typ']);
                    }
                    if (g.restartTarget !== undefined && g.restartTarget !== null){
                        hasUsedCheckpoint = true;

                        curlevelTarget = parseLevel(g.restartTarget);
                    }

                    //    	      g.curlevel = localStorage[document.URL];
                    // TODD: eventually this will work the other way
                    g.curlevel = g.savelevel;
                    //g.restartTarget = g.restartTarget;
                } else {
                    if (localStorage[document.URL+'_checkpoint']!==undefined){
                        var backupStr = localStorage[document.URL+'_checkpoint'];
                        g.restartTarget = JSON.parse(backupStr);
                        curlevelTarget = parseLevel(g.restartTarget);
                        hasUsedCheckpoint = true;
                    }
                    g.savelevel = localStorage[document.URL];
                    g.curlevel = g.savelevel;
                }
            } else {
                newgame();
                
//                g.curlevel = 0;
//                g.savelevel = 0;
//                g.curlevelTarget=null;
                hasUsedCheckpoint = false;
            }
        }		 
    } catch(ex) {
    }
}

doSetupTitleScreenLevelContinue();


var verbose_logging=false;
var throttle_movement=false;
var cache_console_messages=false;
var quittingTitleScreen=false;
var quittingMessageScreen=false;
var deltatime=17;
var timer=0;
var repeatinterval=150;
var autotick=0;
var autotickinterval=0;
var winning=false;
var againing=false;
var againinterval=150;
var norepeat_action=false;
var oldflickscreendat=[];//used for buffering old flickscreen/scrollscreen positions, in case player vanishes
var keybuffer = [];

var restarting=false;

var messageselected=false;

var textImages={};
var initLevel = {
    width: 5,
    height: 5,
    layerCount: 2,
    dat: [
        1, 3, 3, 1, 1, 2, 2, 3, 3, 1,
        2, 1, 2, 2, 3, 3, 1, 1, 2, 2,
        3, 2, 1, 3, 2, 1, 3, 2, 1, 3,
        1, 3, 3, 1, 1, 2, 2, 3, 3, 1,
        2, 1, 2, 2, 3, 3, 1, 1, 2, 2
    ],
    movementMask:[
        1, 3, 3, 1, 1, 2, 2, 3, 3, 1,
        2, 1, 2, 2, 3, 3, 1, 1, 2, 2,
        3, 2, 1, 3, 2, 1, 3, 2, 1, 3,
        1, 3, 3, 1, 1, 2, 2, 3, 3, 1,
        2, 1, 2, 2, 3, 3, 1, 1, 2, 2
    ],
    rigidGroupIndexMask:[],//[indexgroupNumber, masked by layer arrays]
    rigidMovementAppliedMask:[],//[indexgroupNumber, masked by layer arrays]
    bannedGroup:[],
    colCellContents:[],
    rowCellContents:[]
};

var level = initLevel;
