var request = require('request-json');
var client = request.createClient("http://lol-static-data.akpwebdesign.com/");
client.headers["User-Agent"] = "AKPWebDesign/Bravify <https://github.com/AKPWebDesign/Bravify>";
var Promise = require("bluebird");
const jsonfile = require('jsonfile');
const fs = require('fs');
const path = require('path');

//TODO: What happens if the server goes down?
// If we already have local data, we should use that. If not, we should tell the
// user that the server is down, and to try again later.
function APIData() {
  this.dataPath = "";
  this.versionData = {};
  this.champs = {};
  this.champKeys = [];
  this.items = {};
  this.itemKeys = [];
  this.summonerSpells = {};
  this.summonerSpellKeys = {};

  this.badItemGroups = [
    "BootsNormal",
    "DoransItems",
    "BootsFuror",
    "BootsAlacrity",
    "BootsCaptain",
    "BootsDistortion",
    "HealthPotion",
    "FlaskGroup",
    "PinkWards",
    "RelicBase",
    "Flasks",
    "TheBlackSpear",
    "GangplankRUpgrade01",
    "GangplankRUpgrade02",
    "GangplankRUpgrade03"
  ];

  this.badItemNames = [
    "Cull"
  ];

  this.badItemTags = [
    "Boots",
    "Jungle",
    "Trinket",
    "Consumable"
  ];
}

APIData.prototype.loadAll = function (progressFunction) {
  var version = "v1.2"; //TODO: Grab latest version from Riot API rather than using hardcoded string.
  var region = "na"; //TODO: Allow definition of region/language somewhere in UI.
  var self = this;

  if(process.platform == "darwin") {
    this.dataPath = path.join(process.env.HOME, 'Library/Application Support/Bravify');
  } else {
    this.dataPath = path.join(process.env.APPDATA, "Bravify");
  }

  //check version we have against Riot version.
  return this.loadVersionData(region, version).then(function(result) {
    self.versionData = result.data;
    if(fs.existsSync(path.join(self.dataPath, "data.json"))) {
      try {
        var data = jsonfile.readFileSync(path.join(self.dataPath, "data.json"));
        if(data.versions.v !== result.data.v) {
          return self.loadFromServer(region, version, progressFunction);
        } else {
          return self.loadFromCache(data, progressFunction);
        }
      } catch(e) {
        return self.loadFromServer(region, version, progressFunction);
      }
    } else {
      return self.loadFromServer(region, version, progressFunction);
    }
  });
};

APIData.prototype.loadFromServer = function (region, version, progressFunction) {
  var self = this;
  //Load all data using promises.
  return Promise.each([this.loadChamps(region, version), this.loadItems(region, version),
               this.loadSummonerSpells(region, version), this.loadVersionData(region, version)], function(result, index, length) {
                 progressFunction(index, length);
               })
  .then(function(result){
    var data = {};
    for (var i = 0; i < result.length; i++) {
      data[result[i].key] = result[i].data;
    }
    self.saveToCache(data);
    progressFunction(1, 1);
  }, function(error){
    //if any data errors, we come here.
    console.error(error);
    throw "There was an error loading data!";
  });
};

APIData.prototype.loadFromCache = function (data, progressFunction) {
  var self = this;
  return new Promise(function(resolve, reject) {
    //ezpz, just pull data from object.
    self.champs = data.champs;
    self.items = data.items;
    self.summonerSpells = data.spells;
    self.versionData = data.versions;
    self.champKeys = data.champKeys;
    self.itemKeys = data.itemKeys;
    self.summonerSpellKeys = data.summonerSpellKeys;
    resolve("All data loaded from cache.");
  }).then(function(result){
    progressFunction(1, 1);
  }, function(error){
    //if any data errors, we come here.
    console.error(error);
    throw "There was an error loading data!";
  });
};

APIData.prototype.saveToCache = function (data) {
  var dataPath = this.dataPath;
  data.champKeys = this.champKeys;
  data.itemKeys = this.itemKeys;
  data.summonerSpellKeys = this.summonerSpellKeys;
  try {
    jsonfile.writeFileSync(path.join(dataPath, "data.json"), data);
  } catch(e) {
    console.error(e);
  }
};

APIData.prototype.loadVersionData = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/versions`, function(err, res, body){
      if(err || (body.status && body.status == "Error")) {reject(body); return;}
      self.versionData = body;
      resolve({key: "versions", status: "success", data: body});
    });
  });
};

APIData.prototype.loadChamps = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/champs`, function(err, res, body){
      if(err || (body.status && body.status == "Error")) {reject(body); return;}
      self.champs = body;
      for (var key in body) {
        if (body.hasOwnProperty(key)) {
          self.champKeys.push(key);
        }
      }
      resolve({key: "champs", status: "success", data: body});
    });
  });
};

APIData.prototype.loadItems = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/items`, function(err, res, body){
      if(err || (body.status && body.status == "Error")) {reject(body); return;}
      self.items = body;
      for (var key in body) {
        if (body.hasOwnProperty(key)) {
          var goodItem = true;

          if(body[key].tags) {
            for (var i = 0; i < body[key].tags.length; i++) {
              var tag = body[key].tags[i];

              //check item tags here, since we're already looping them.
              if(self.badItemTags.includes(body[key].tags[i])) {
                goodItem = false;
              }
            }
          }

          var goodItem = true;

          //check item group
          if(body[key].group && self.badItemGroups.includes(body[key].group)) {
            goodItem = false;
          }

          //check item name
          if(self.badItemNames.includes(body[key].name)) {
            goodItem = false;
          }

          //check for stupid consumable tag
          if(body[key].consumed) {
            goodItem = false;
          }

          if(goodItem) {
            self.itemKeys.push(key);
          }
        }
      }
      resolve({key: "items", status: "success", data: body});
    });
  });
};

APIData.prototype.loadSummonerSpells = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/spells`, function(err, res, body){
      if(err || (body.status && body.status == "Error")) {reject(body); return;}
      self.summonerSpells = body;
      for(var key in body) {
        if(body.hasOwnProperty(key)) {
          for (var i = 0; i < body[key].modes.length; i++) {
            var mode = body[key].modes[i];
            if(!self.summonerSpellKeys[mode]) {
              self.summonerSpellKeys[mode] = [];
            }
            self.summonerSpellKeys[mode].push(key);
          }
        }
      }
      //console.log(self.summonerSpellKeys);
      resolve({key: "spells", status: "success", data: body});
    });
  });
};

module.exports = APIData;
