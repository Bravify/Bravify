function ItemSetGenerator() {
  this.baseItemSet = require('./base_itemset');
}

ItemSetGenerator.prototype.generate = function (build) {
  var itemSet = JSON.parse(JSON.stringify(this.baseItemSet));

  //clear items from set
  itemSet.blocks[0].items = [];

  //change first block name to include skill leveling info.
  itemSet.blocks[0].type += " (";
  for (var i = 0; i < build.skills.order.length; i++) {
    itemSet.blocks[0].type += build.skills.order[i] + " > ";
  }
  itemSet.blocks[0].type = itemSet.blocks[0].type.slice(0, -3);
  itemSet.blocks[0].type += ")";

  //add items to first block.
  for (var i = 0; i < build.items.length; i++) {
    itemSet.blocks[0].items.push({id: build.items[i].id, count: 1});
  }


  //title set
  itemSet.title = build.adjective.toUpperCase() + " " + build.champ.name.toUpperCase();

  //set champion for set
  itemSet.champion = build.champ.name;

  return itemSet;
};

module.exports = ItemSetGenerator;
