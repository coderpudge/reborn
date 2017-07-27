// import {fishData} from "./config/fish.js";
// import {eatAnimData} from "./config/eatAnim.js";
import { DataManager } from "./game/DataManager";

import { Utils } from "./utils/Utils";
import { Vec2 } from '../../creator.d';
import { DataManager } from '../../library2/imports/c5/c566bd72-1d10-4b5d-99d0-69afc37fc68c';

const { ccclass, property } = cc._decorator;

/**
 * 鱼竿状态
 */
enum robStatus {
    prepare = 0,
    robPush,
    robPull,
}

enum eatType {
    //力
    force = 0,
    //冲量
    impulse = 1
}
//吸力系数
var rate_suction = 2.2;
//试探时吸力系数
var rate_trySuction = 1;
//持续力系数
var rate_impulse = 1;
//吸力的 冲量时间系数 s
var suctionTime = 1;
// 入口持续时间 s
var eatTime = 15;
//抛竿,提竿 免疫上钩时间 ms
var immuneTime = 10;

@ccclass
export default class game extends cc.Component {
    @property(cc.Node)
    canvas = null;
    @property(cc.Animation)
    rob = null;
    @property(cc.RigidBody)
    buoy = null;
    @property(cc.RigidBody)
    sinker = null;
    @property(cc.RigidBody)
    hook = null;
    @property(cc.Node)
    water = null;
    @property(cc.Label)
    tips = null;
    @property(cc.Animation)
    fishAnim = null;
    @property(cc.Node)
    nodes = [];


    // @property(cc.AnimationState)
    _animState = null;
    // @property(Number)
    _robState = robStatus.prepare;
    // @property(cc.Vec2)
    _buoyPos = cc.v2();
    // @property(cc.Vec2)
    _sinkerPos = cc.v2();
    // @property(cc.Vec2)
    _hookPos = cc.v2();
    // @property(Number)
    _forceTime = 0;
    // @property(Number)
    _data = [];
    // @property(Number)
    _dataIdx = null;
    // @property(Object)
    _dataObj = null;
    // @property([String])
    _fishDefaultAnim = [];
    // @property([String])
    _eatAnim = [];
    //鱼饵
    _bait = [];

    //当前鱼塘 ID
    _curLocationId = 1;        //传值
    //当前窝料 ID
    _curNestBaitId = 1;
    //当前窝料
    _curNestBait = {};
    //当前窝料诱惑力
    // _curNestLure = 0;
    //当前饵料诱惑力
    _curBaitLure = 1;
    //当前吃饵的鱼
    _curFish = null;
    // 当前吃饵的力的类型
    _curEatType = null;
    // 当前鱼的力
    _curFishForce = cc.v2();
    // 当前鱼的冲量
    _curFishImpulse = cc.v2();
    //抛竿,提竿 免疫上钩时间
    _immuneTime = 10 * 1000;
    //持续力 的持续时间
    _unbrokenTime = 0;
    _isTryEat = false;



    onLoad() {
        DataManager.init();

        this._buoyPos = this.buoy.node.position;
        this._sinkerPos = this.sinker.node.position;
        this._hookPos = this.hook.node.position;
        var self = this;
        //触摸监听鱼竿操作
        self.canvas.on(cc.Node.EventType.TOUCH_START, function (event) {
            var touches = event.getTouches();
            var touchLoc = touches[0].getLocation();
            // cc.log(touchLoc);
            self.robControl();
        }, self);
        self.rob.on('finished', self.onFinished, self);
        /**
         * test
         */
        self.onRegisteredEvent();



        this._fishDefaultAnim = DataManager.getBaseData("fishDefaultAnim", null);
        this._eatAnim = DataManager.getBaseData("eatAnim", null);
        // 鱼塘钓点
        this._curLocationId = 1;
        var nestBaitDF = DataManager.getBaseData("nestBait", null);
        //窝料
        var nestBaitTmp = DataManager.getNestBait(this._curLocationId);
        if (nestBaitTmp) {
            if (nestBaitTmp["startTime"] + nestBaitDF[this._curLocationId]["duration"] > Date.now()) { //生效期
                this._curNestBait = nestBaitDF[this._curLocationId + ""];
                this._curNestBait["startTime"] = nestBaitTmp["startTime"];
            }
        } else {
            DataManager.useNestBait(this._curLocationId, this._curNestBaitId);
            this._curNestBait = nestBaitDF[this._curLocationId + ""];
            this._curNestBait["startTime"] = Date.now();
        }

        if (DataManager.isNeedCreate()) {
            DataManager.createFishAIByLocation(1);
        }
        // 定时器
        cc.director.getScheduler().schedule(this.updateDistance, this, 1, cc.macro.REPEAT_FOREVER, 0, false);
    }
    /**
     * 鱼竿操作
     */
    robControl() {
        // this.updateFluidArea(100);
        this.hook.node.stopAllActions();
        if (this._robState == robStatus.prepare) {
            cc.log("push")
            this.push();
            this._robState = robStatus.robPush;
        } else if (this._robState == robStatus.robPush) {
            cc.log("pull")
            this.pull();
            this._robState = robStatus.prepare;
        }
    }
    /**
     * 抛竿
     */
    push() {
        this._immuneTime = immuneTime;
        this.updateFish(null);
        this._animState = this.rob.play("pushRob");
    }
    /**
     * 起竿
     */
    pull() {
        this.showHook(false);
        this.setCurEatType(eatType.impulse);
        if (this._dataObj == null) {
            this.getNoFish();
        }

        var rdm = Math.random() * 100;
        cc.log("roll",rdm);

        var list = [
            {startPercent:0, endPercent:30, probability:0},
            {startPercent:31, endPercent:40, probability:20},
            {startPercent:41, endPercent:50, probability:40},
            {startPercent:51, endPercent:60, probability:50},
            {startPercent:61, endPercent:70, probability:60},
            {startPercent:71, endPercent:80, probability:80},
            {startPercent:81, endPercent:100, probability:100}
        ];
        var percent = this._unbrokenTime/eatTime * 100;
        cc.log("进度:"+percent)
        for(var i =0; i<list.length; i++){
            var obj = list[i];
            if (percent >= obj.startPercent && percent <= obj.endPercent ) {
                if (obj.probability == 0) {
                    cc.log(obj.probability+"%几率, 没有中鱼, 提示提竿过早!")
                    this.getNoFish();
                    return;
                }
                if (obj.probability == 100) {
                    cc.log(obj.probability+"%几率, 中鱼了!")
                    this.getFish();
                    return;
                }
                if (obj.probability > 100) {
                    cc.log(obj.probability+"%几率, 没有中鱼, 鱼跑了!")
                    this.getNoFish();
                    return;
                }



                if (rdm < obj.probability) {
                    cc.log(obj.probability+"%几率, 中鱼了!")
                    this.getFish();
                }else{
                    if (obj.probability == 0) {
                        cc.log(obj.probability+"%几率, 没有中鱼, 提示提竿过早!")
                        this.getNoFish();
                    }else{
                        cc.log(obj.probability+"%几率, 没有中鱼")
                        this.getNoFish();
                    }
                }
            }
        }

    }
    getFish() {
        this._animState = this.rob.play("pullRobGetFish");
        
    }
    getNoFish() {
        this._animState = this.rob.play("pullRobNoFish");
       
    }

    /**
     * 动画播放完成
     */
    onFinished() {
        var key = this._animState.name;
        cc.log("onFinished", key)
        switch (key) {
            case "pushRob":
                this.showHook(false);
                this.resetHook();
                // this.physicSwitch(true);
                // this.eat(1);
                break;
            case "pullRobGetFish":
                this.tips.string = "catch fish !";
                this.fishAnim.playAdditive("fishInBasket");
                var fishType = this.getfishDefaultAnim();
                this.createFishJumpClip(fishType.name, fishType.frames);

                DataManager.catchFish();
                break;
            case "pullRobNoFish":
                this.tips.string = "fish going !";
                 DataManager.scareFish();
                break;
            default:
                break;
        }
    }
    /**
     * 重置线组状态
     */
    resetHook() {
        this._dataIdx = 0;
        this._dataObj = null;
        this._forceTime = 0;

        this.buoy.node.position = this._buoyPos;
        this.sinker.node.position = this._sinkerPos;
        this.hook.node.position = this._hookPos;
        //随机位置
        var rdmx = Math.random() * 200 - 100;
        this.buoy.node.x = rdmx;
        this.sinker.node.x = rdmx;
        this.hook.node.x = rdmx;

        this.showHook(true)
    }
    /**
     * 显示隐藏线组
     * @param {*状态} flag 
     */
    showHook(flag) {
        if (flag) {
            this.buoy.node.opacity = 255;
            this.sinker.node.opacity = 255;
            this.hook.node.opacity = 255;

        } else {
            this.buoy.node.opacity = 0;
            this.sinker.node.opacity = 0;
            this.hook.node.opacity = 0;
        }
    }

    /**
     * 物理引擎开关
     * @param {*开关} flag 
     */
    physicSwitch(flag) {
        let physicsManager = cc.director.getPhysicsManager();
        physicsManager.enabled = flag;
    }
    /**
     * 模仿鱼吃钩效果
     */
    eat(key) {
        // var hookPos = this.hook.getWorldPosition();
        // var forceType = 1;
        this._data = this.getEatAnimData();
        var vector = cc.v2(-300, -300);
        switch (key) {
            case 1:
                var seqArray = [];
                // cc.log("eatAnim:", this._data);
                // for(let obj of this._data){
                //     // this._dataIdx = index;
                //     // this._dataObj = obj;

                //     let setIdxFunc = cc.callFunc(this.setDataIdx, this);
                //     seqArray.push(setIdxFunc);

                //     let delay = cc.delayTime(obj.delay);
                //     seqArray.push(delay);

                // }

                /* for (var i = 0; i < this._data.length; i++) {
                    // this._dataIdx = index;
                    // this._dataObj = obj;

                    let setIdxFunc = cc.callFunc(this.setDataIdx, this);
                    seqArray.push(setIdxFunc);

                    let delay = cc.delayTime(this._data[i].delay);
                    seqArray.push(delay);

                }
                var seq = cc.sequence(seqArray);
                this.hook.node.runAction(seq); */

                //在刚体上施加vector压力。
                //body.GetWorldCenter()方法用来获取刚体的重心
                // this.hook.applyForce(cc.v2(0,-800), this.hook.getWorldCenter());
                break;
            case 2:
                //为刚体添加速度
                this.hook.applyLinearImpulse(vector, this.hook.getWorldCenter());
                break;
            case 3:
                //唤醒刚体
                // this.hook.wakeUp();
                //设置刚体的线性速度
                // this.hook.linearVelocity = vector;
                this.hook.applyForce(vector, this.hook.getWorldCenter());
                break;
        }
    }
    /**
     * 设置当前鱼吃钩动作索引
     */
    setDataIdx() {
        this._dataIdx = this._dataIdx || 0;
        cc.log("setIdx:", this._dataIdx);
        this._dataObj = this._data[this._dataIdx];
        this._forceTime = this._dataObj.delay;
        this.tips.string = "第" + (this._dataIdx + 1) + "组动作,持续" + this._dataObj.delay + "秒，抓住鱼的概率为" + this._dataObj.probability;
        if (this._dataIdx < this._data.length - 1) {
            this._dataIdx += 1;
        }
    }

    /**
     * 获取随机鱼品种的数据
     */
    getfishDefaultAnim() {
        if (this._fishDefaultAnim == null || this._fishDefaultAnim == undefined) {
            this._fishDefaultAnim = DataManager.getBaseData("fishDefaultAnim", null);
        }
        cc.log("fishDefaultAnim", this._fishDefaultAnim);
        var rdm = this.getRandomInt(0, this._fishDefaultAnim.length - 1);
        return this._fishDefaultAnim[rdm];
    }
    /**
     * 获取随机 鱼咬钩动作的数据
     */
    getEatAnimData() {
        if (this._eatAnim == null || this._eatAnim == undefined) {
            this._eatAnim = DataManager.getBaseData("eatAnim", null);
        }
        var rdm = this.getRandomInt(0, this._eatAnim.length - 1);
        return this._eatAnim[rdm];
    }
    /**
     * 返回一个介于min和max之间的整型随机数
     * @param {*最小值} min 
     * @param {*最大值} max 
     */
    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    /**
     * 创建动画
     */
    createFishJumpClip(name, count) {
        var animation = this.fishAnim.getComponent(cc.Animation);
        cc.loader.loadRes(name, cc.SpriteAtlas, (err, atlas) => {
            var spriteFrames = atlas.getSpriteFrames();
            var clip = cc.AnimationClip.createWithSpriteFrames(spriteFrames, count);
            clip.name = 'fishJump';
            clip.wrapMode = cc.WrapMode.Loop;

            animation.addClip(clip);
            animation.playAdditive('fishJump');
        });
    }
    /**
     * 
     * @param {*渔具类型：鱼竿 鱼漂 铅坠 鱼钩} gearType 
     * @param {*渔具ID：光威鱼竿ID 达亿瓦鱼竿ID 伊豆鱼钩4#ID} gearId 
     */
    changeGear(gearType, gearId) {

    }
    /**
     * 增加铅坠重量 （更改铅坠体积宽度）
     * @param {*增加重量} weight 
     */
    changeSinker(weight) {

    }
    /**
     * 通过更改浮力水面的高度 实现甩竿远近
     * @param {*浮力水面的高度} height 
     */
    updateFluidArea(height) {
        this.water.height = height;
        // this.water.setContentSize(this.water.width, height);
    }

    /**
     * set get this._curEatType
     */
    getCurEatType() {
        return this._curEatType;
    }
    setCurEatType(type) {
        this._curEatType = type;
    }

    progressEat() {
        

   
        cc.log("冲量开始..",new Date().getSeconds())
        //冲量阶段
        this.hook.applyLinearImpulse( this._curFishImpulse, this.hook.getWorldCenter());
        // Utils.sleep(suctionTime);
        setTimeout(function () {
            cc.log("time out",new Date().getSeconds())
            //持续力阶段
            this.setCurEatType(eatType.force);
            // 持续时间
            this._unbrokenTime = eatTime;
        }.bind(this), suctionTime * 1000); 
    }
    /**
     * 吸力
     */
    getSuction(weight) {
        return weight * rate_suction;
    }
    
    /**
     * 随机 ccpNormalize 冲量方向
     */
    getVector() {
        var r1 = Math.random();
        var r2 = Math.random();
        return cc.v2(0, -r2);
    }
    /**
     * 冲量
     * @param weight 
     * @param time 
     */
    getImpulse(weight, time) {
        var suction = this.getSuction(weight);
        var vector = this.getVector();
        var impulse = cc.v2(vector.x * suction * time, vector.y * suction * time);
        return impulse;
    }
    /**
     * 更改当前鱼状态
     * @param fish 
     */
    updateFish(fish){
        if (fish) {
            this._curFish = fish;
            this._isTryEat = this._curFish["tryEat"] >= 80;
            cc.log("试探判断:",this._isTryEat);
            //力
            var suction = this.getSuction(fish.weight);
            var vector = this.getVector();
            var tryEat = rate_trySuction;
            if (!this._isTryEat) {
                tryEat = 1;
            }
            this._curFishForce = cc.v2(vector.x * suction * tryEat, vector.y * suction * tryEat);
            this._curFishImpulse = cc.v2(vector.x * suction * tryEat * suctionTime, vector.y * suction * tryEat * suctionTime);
        }else{
            this._curFish = fish;
            this._curFishForce = cc.v2();
            this._curFishImpulse = cc.v2();
        }
    }
    updateDistance(dt) {
        // cc.log(Date.now(),dt);
        //位置更新
        if (this._robState == robStatus.robPush ){
            DataManager.updateDistance(dt, this._curNestBait["allure"] || 0, this._curBaitLure)
        }
        //窝料更新
        DataManager.updateNestBait()
    }
    update(dt) {
        // 抛竿后 检测鱼
        if (this._robState == robStatus.robPush && !this._curFish) {

            if (this._immuneTime > 0) {
                this._immuneTime = this._immuneTime - dt;
                cc.log("免疫吃饵中..", this._immuneTime);
                return;
            }
            if (this._immuneTime <= 0) {
                this._immuneTime = 0;
                cc.log("免疫结束,正在检测鱼情");
            }

            if (DataManager.getPrepareEatFish()) {
                cc.log("已检测到鱼");
                var fish = DataManager.getPrepareEatFish();
                this.updateFish(fish);
                // 启动吃饵过程
                this.progressEat();
            }
        }
        // 持续力
        if (this._curEatType == eatType.force) {
            cc.log("持续施加力..")
            // this.hook.applyForce(this._curFishForce, this.hook.getWorldCenter());
            this.hook.applyForce(this.getImpulse(this._curFish["weight"],rate_impulse), this.hook.getWorldCenter());
            if(this._unbrokenTime >= 0){
                this._unbrokenTime -= dt;
            }else{
                cc.log("停止施加持续力,类型为冲量")
                this.setCurEatType(eatType.impulse);
            }
        } 
       
    }

    /**
     * test function
     */
    onRegisteredEvent() {
        for (var i = 0; i < this.nodes.length; ++i) {
            this.nodes[i].on(cc.Node.EventType.TOUCH_END, this.onButtonEnter.bind(this));
        }
    }

    onButtonEnter(event) {
        switch (event.target._name) {
            case "f1":
                this.eat(1);
                cc.log("f1");
                break;
            case "f2":
                this.eat(2);
                cc.log("f2");
                break;
            case "f3":
                cc.log("f3");
                this.eat(3);
                break;
        }
    }
}
