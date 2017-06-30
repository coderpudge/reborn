import { Utils } from "../utils/Utils";

const { ccclass, property } = cc._decorator;

/**
// 钓点配置表
var cfg_Location_Table_Def = [
    id,//地点 ID
    amount, //数量
    fishType, //鱼的种类
    fishAmount, //鱼的数量区间
    fishWeight, //鱼的重量区间
]
**/

//鱼的品种
// var fishTypeDef = [
//     type, //品种 ID
//     name,//名称
//     weight, //体重区间
//     suctionFactor, //吸食力系数
//     impactFactor, //冲撞力系数
//     enduranceFactor, //耐力系数
//     caliberFactor, //口径系数
// ]
enum bagType {
    fish = 1, //鱼
    rob = 2, //竿
    buoy = 3, //漂
    sinker = 4, // 坠
    hook = 5, //钩
    nest = 6, //窝料
    bait = 7, //饵料

}


@ccclass
export class DataManager {

    static _baseConfigData = {};
    static _configCache = {};
    static _fishLocation = [];
    static _preparedFish = [];
    static _bag = {};
    static _loadConfig = false;
    static jsonRes = [
        "location",
        "fishType",
        "eatAnim",
        "fishDefaultAnim",
        "item"
    ];

    static init() {
        this.jsonRes.forEach(element => {
            // cc.log(element);
            this.initBaseData(element);
        });
    }
    static testInitItem() {
        var items = this.getBaseDataItem(null);
        for (var key in items) {
            if (items.hasOwnProperty(key)) {
                var element = items[key];ß
                element["num"] = 1;
                var cur = this._bag[element["type"]][element["id"]];
                if (element["mult"] == 1 && cur != undefined) {
                    cur["num"]++;
                    this._bag[element["type"]][element["id"]] = cur;
                } else {
                    this._bag[element["type"]][element["id"]] = element;
                }
            }
        }
    }
    /**
     * 钓点配置
     * @param id 
     */
    static getBaseDataLocation(id) {
        return this.getBaseData("location", id)
    }
    /**
     * 鱼品种配置
     * @param id 
     */
    static getBaseDataFishType(id) {
        return this.getBaseData("fishType", id)
    }
    /**
     * 吃钩动作配置
     * @param id 
     */
    static getBaseDataEatAnim(id) {
        return this.getBaseData("eatAnim", id)
    }
    /**
     * 上鱼动画配置
     * @param id 
     */
    static getBaseDataFishDefaultAnim(id) {
        return this.getBaseData("fishDefaultAnim", id)
    }
    /**
     * 物品
     * @param id 
     */
    static getBaseDataItem(id) {
        return this.getBaseData("item", id)
    }


    static getBaseData(df, id) {
        if (!this._configCache[df] || this._baseConfigData[df] == null) {
            this.CheckCfg(df);
        }
        if (!this.isLoadConfig()) return;
        if (id != null) {
            return this._baseConfigData[df][id + ""];
        } else {
            return this._baseConfigData[df];
        }
    }

    static initBaseData(df) {
        if (!this._configCache[df] || this._baseConfigData[df] == null) {
            this.CheckCfg(df);
        }
    }
    static CheckCfg(df) {
        cc.log(this._configCache);
        if (!this._configCache[df]) {
            var me = this;
            cc.loader.load(cc.url.raw("resources/config/" + df + ".json"), function (errors, results) {
                if (errors) {
                    for (var i = 0; i < errors.length; i++) {
                        cc.log('Error url [' + errors[i] + ']: ' + results.getError(errors[i]));
                    }
                }
                me._baseConfigData[df] = results;
                me._configCache[df] = true;
                // cc.log(df,":",results);
            });
        }
    }
    static createFishAIByLocation(locationId) {
        if (!this.isLoadConfig()) {
            return;
        }
        var location = this.getBaseDataLocation(locationId);
        var fishType = location["fishType"];
        var fishAmount = location["fishAmount"];
        var fishWeight = location["fishWeight"];
        var zone = location["zone"];

        var index = 0;
        var uid = 0;
        fishType.forEach(element => {
            // cc.log("index",index);
            var fish = this.getBaseDataFishType(element);
            var amount = Utils.getRandomInt(fishAmount[index][0], fishAmount[index][1]);
            for (var i = 0; i < amount; i++) {
                uid++;
                var tempFish = Utils.clone(fish);
                var weight = Utils.getRandomInt(fishWeight[index][0], fishWeight[index][1]);
                // 质量
                tempFish["weight"] = weight;
                // 唯一编号
                tempFish["uid"] = uid;
                //与钩的距离
                var distance = Utils.getRandomInt(zone[0], zone[1]);
                tempFish["distance"] = distance;
                tempFish["goneDistance"] = 0;
                //抗诱惑力
                var resistAllure = Utils.getRandomInt(fish["resistAllure"][0], fish["resistAllure"][1]);
                tempFish["resistAllure"] = resistAllure;
                tempFish["uid"] = uid
                this._fishLocation[uid] = tempFish;
            }
            index++;
        });
        cc.log("create fish count:" + uid);
        // cc.log("location"+locationId+":",JSON.stringify(this._fishLocation));
    }
    static getFishLocation(id) {
        if (!this.isLoadConfig()) {
            return false;
        }
        return this._fishLocation[id];
    }

    static isNeedCreate() {
        if (!this.isLoadConfig()) {
            return false;
        }
        var locationEmpty = true;
        for (var key in this._fishLocation) {
            if (this._fishLocation.hasOwnProperty(key)) {
                locationEmpty = false;
            }
        }
        var prepareEmpty = this._preparedFish.length > 0 ? false : true;
        if (locationEmpty && prepareEmpty) {
            return true;
        }
        return false;
    }

    static isLoadConfig() {
        if (this._loadConfig) {
            return true;
        }
        // cc.log("baseConfig",this._baseConfigData)
        var error = null;
        this.jsonRes.forEach(key => {
            if (!this._baseConfigData.hasOwnProperty(key)) {
                error += key + " is not loading " || "";
            }
        });
        if (error != null) {
            // cc.log(error);
            return false;
        } else {
            // cc.log("loading success")
            this._loadConfig = true;
            return true;
        }
    }
    /**
     * 更新鱼群位置
     * @param dt 
     * @param nestLure 窝料诱惑力
     * @param baitLure 饵料诱惑力
     */
    static updateDistance(dt, nestLure, baitLure) {
        var time = 1 * dt;
        var count = 0;
        var nearestDistance = null;
        var nearestKey = 0;
        var nearestSpeed = 0;
        var rmCount = 0;
        for (var key in this._fishLocation) {
            if (this._fishLocation.hasOwnProperty(key)) {
                var element = this._fishLocation[key];
                var distance = element["distance"]
                // 单位时间的距离 =（饵料的诱惑力+窝料的诱惑力）*总距离*系数/（鱼的抗诱惑力+饵料的诱惑力+窝料的诱惑力）
                var speed = (nestLure + baitLure) * distance * 0.5 / (element["resistAllure"] + nestLure + baitLure);
                if (element["distance"] > element["goneDistance"]) {
                    this._fishLocation[key]["goneDistance"] = element["goneDistance"] + speed * time;
                    if (nearestDistance == null || nearestDistance > element["distance"] - this._fishLocation[key]["goneDistance"]) {
                        nearestDistance = element["distance"] - this._fishLocation[key]["goneDistance"];
                        nearestKey = Number(key);
                        nearestSpeed = speed;
                    }

                    if (element["distance"] <= element["goneDistance"]) {
                        // this._fishLocation[key]["goneDistance"] = element["distance"];
                        var prepare = this._fishLocation[key];
                        this._fishLocation[key] = null;
                        this._preparedFish.push(prepare);
                        delete this._fishLocation[key];
                        rmCount++;
                    }
                    count++;
                } else {
                    cc.log("error")
                }
            }
        }
        cc.log("rm:" + rmCount + " pool count:" + (count - rmCount), "prepare:" + this._preparedFish.length, "nearestKey:" + nearestKey + " nearestSpeed:" + nearestSpeed + " nearest:" + nearestDistance);
    }

    /**
     * 捕获到鱼
     */
    static catchFish(key) {
        var fish = this._fishLocation[key]
        fish["time"] = Date.now();
        this._bag[fish["type"]] = this._bag[fish["type"]] || [];
        this._bag[fish["type"]].push(fish);
        delete this._fishLocation[key];
    }

    /**
     * 移除
     */
    static removeFish() {
        for (var key in this._fishLocation) {
            if (this._fishLocation.hasOwnProperty(key)) {
                var element = this._fishLocation[key];
                var distance = element["distance"]
                if (element["distance"] < 0) {
                    delete this._fishLocation[key];
                }
            }
        }
    }

    /*
        getTableData(tableDF,table,id)
        {
            if(table[id])
            {
                var dic = {};
                for(var key in tableDF){
                    dic[tableDF[key]] = table[id][key];
                }
                return dic;
            }
            return null;
        }
        getTableRowCount(table) {
            var count = 0;
            for (var k in table) {
                ++count;
            }
            return count;
        }
    
        createFishAIByLocation(locationId){
    
        }
    */

}
