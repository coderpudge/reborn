import {Utils} from "../utils/Utils";

const {ccclass, property} = cc._decorator;

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
//     id, //品种 ID
//     name,//名称
//     weight, //体重区间
//     suctionFactor, //吸食力系数
//     impactFactor, //冲撞力系数
//     enduranceFactor, //耐力系数
//     caliberFactor, //口径系数
// ]


@ccclass
export  class DataManager  {

    static _baseConfigData = {};
    static _configCache = {};
    static _fishLocation = {};
    static  jsonRes = [
            "location",
            "fishType",
            "eatAnim",
            "fishDefaultAnim"
        ];
    
    static init(){
        this.jsonRes.forEach(element => {
            // cc.log(element);
            this.initBaseData(element);
        });
    }
    /**
     * 钓点配置
     * @param id 
     */
    static getBaseDataLocation(id){
        return this.getBaseData("location",id)
    }
    /**
     * 鱼品种配置
     * @param id 
     */
     static getBaseDataFishType(id){
        return this.getBaseData("fishType",id)
    }
    /**
     * 吃钩动作配置
     * @param id 
     */
     static getBaseDataEatAnim(id){
        return this.getBaseData("eatAnim",id)
    }
    /**
     * 上鱼动画配置
     * @param id 
     */
     static getBaseDataFishDefaultAnim(id){
        return this.getBaseData("fishDefaultAnim",id)
    }

    static getBaseData(df,id){
        if(!this._configCache[df] || this._baseConfigData[df] == null){
            this.CheckCfg(df);
        }
        if(!this.isLoad()) return;
        if(id != null){
            return this._baseConfigData[df][id+""];
        }else {
            return this._baseConfigData[df];
        }
    }

    static initBaseData(df){
        if(!this._configCache[df] || this._baseConfigData[df] == null){
            this.CheckCfg(df);
        }
    }
    static CheckCfg(df)
    {
        cc.log(this._configCache);
        if(!this._configCache[df]){
            var me = this;
            cc.loader.load(cc.url.raw("resources/config/"+df+".json"), function (errors, results) {
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
    static createFishAIByLocation(locationId){
        if(!this.isLoad()){
            return;
        } 
        var location = this.getBaseDataLocation(locationId);
        var fishType = location["fishType"];
        var fishAmount = location["fishAmount"];
        var fishWeight = location["fishWeight"];

        var index = 0;
        var uid = 1;
        fishType.forEach(element => {
            cc.log("index",index);
            var fish = this.getBaseDataFishType(element);
            var amount = Utils.getRandomInt(fishAmount[index][0],fishAmount[index][1]);
            this._fishLocation[element] = this._fishLocation[element] || {};
            for (var i = 0; i < amount; i++) {
                var tempFish = Utils.clone(fish);
                var weight = Utils.getRandomInt(fishWeight[index][0],fishWeight[index][1]);
                // 质量
                tempFish["weight"] = weight;
                // 唯一编号
                tempFish["uid"] = uid;
                //位置
                var x = Utils.getRandomInt(0,1000);
                var y = Utils.getRandomInt(0,1000);
                tempFish["pos"] = cc.v2(x,y);
                this._fishLocation[element][uid] = tempFish;
                uid++;
            }
            index ++;
        });
        // cc.log("location"+locationId+":",JSON.stringify(this._fishLocation));
    }
    static getFishLocation(id){
        if(!this.isLoad()){
            return null;
        }
        return this._fishLocation[id];
    }
    static isLoad(){
        // cc.log("baseConfig",this._baseConfigData)
        var error = null;
        this.jsonRes.forEach(key => {
            if (!this._baseConfigData.hasOwnProperty(key)) {
                error += key+" is not loading " || "";
            }
        });
        if(error != null){
            // cc.log(error);
            return false;
        }else{
            // cc.log("loading success")
            return true;
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
