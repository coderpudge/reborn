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
enum robState {
    prepare = 0,
    robPush,
    robPull,
}
/**
 * 施加力方式
 */
enum eatType {
    //力
    force = 0,
    //冲量
    impulse = 1
}

/**
 * eatState
 */
enum eatState {
    start = 0,
    impulse = 1,
    force = 2,
    leave = 3,
    end = 4
}

//吸力系数
var rate_suction = 1.1;
//试探时吸力系数
var rate_trySuction = 1;
//持续力系数
var rate_force = 1;
//吸力的 冲量时间系数 s
var suctionTime = 1;
// 入口持续时间 s
var eatTime = 5;
// 入口时间变化区间 0.8 ~ 1
var eatTimeZome = 0.8
//抛竿,提竿 免疫上钩时间 ms
var immuneTime = 10;

// 是否试探的概率
var rate_tryEat = 80;
// 每次试探的持续时间 (s)
var tryEatTime = 5;
// // 试探冲量系数
// var rate_tryEatImpulse = 0.9;
// // 试探冲量时间系数
// var rate_tryEatImpulseTime = 0.9;
// 试探力系数
var rate_tryEatForce = 0.8;
// 试探力时间持续系数
var rate_tryEatForceTime = 0.8;
// 试探次数
var tryEatMaxTimes = 3;

// 挡口力系数
var rate_blockEatForce = 0.6;
// 挡口力持续时间系数
var rate_blockEatForceTime = 0.6;

// 提竿延时时间
var delayPullTime = 0.5;
// 吐出时间
var spitOutTime = 1;

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
    _robState = robState.prepare;
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
    //是否试探
    _isTryEat = false;
    //试探次数
    _tryEatTimes = 0;
    //是否档口
    _isBlockEat = false;
    //试探力/时间系数
    _rateTryEatForce = 1;
    _rateTryEatTime = 1; 
    //挡口力/时间系数
    _rateBlockEatForce = 1;
    _rateBlockEatTime = 1; 

    _scheduleCount = 0;


    onLoad() {
        // DataManager.init();

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
        if (this._robState == robState.prepare) {
            cc.log("push")
            this.push();
            this._robState = robState.robPush;
        } else if (this._robState == robState.robPush) {
            cc.log("pull")
            this.pull();
            this.afterPull();
            
        }
    }
    /**
     * 抛竿
     */
    push() {
        this.tips.string = "";
        this._immuneTime = immuneTime;
        this.updateFish(null);
        this._animState = this.rob.play("pushRob");
       
    }
    /**
     * 起竿
     */
    pull() {
        this.hook.applyLinearImpulse( this._curFishImpulse.mul(10), this.hook.getWorldCenter(),true);
        this.showHook(false);
        
        // if (this._dataObj == null) {
        //     this.tips.string = "没有鱼数据";
        //     this.getNoFish();
        //     return;
        // }

        if (this._isTryEat) {
            this.tips.string = "鱼跑了,它在试探..";
            this.getNoFish();
            return;
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
        var allTime = this.getUnBrokenTime();
        var percent = (this._unbrokenTime + delayPullTime) / allTime * 100;
        var tipstring = "进度:"+percent;
        cc.log("进度:"+percent)
        this.tips.string = tipstring;
        if (percent <= 0) {
            tipstring = "提示提竿过早!";
            cc.log(tipstring);
            this.tips.string = tipstring;
            this.getNoFish();
            return;
        }

        if (percent > 100) {
            tipstring = "鱼跑了!";
            cc.log(tipstring);
            this.tips.string = tipstring;
            this.getNoFish();
            return;
        }
        for(var i =0; i<list.length; i++){
            var obj = list[i];
            if (percent >= obj.startPercent && percent <= obj.endPercent ) {
                
                if (rdm < obj.probability) {
                    tipstring = obj.probability+"%几率, 中鱼了!";
                    cc.log(tipstring);
                    this.tips.string = tipstring;
                    this.getFish();
                }else{ 
                    tipstring = obj.probability+"%几率, 鱼逃走了!";
                    cc.log(tipstring);
                    this.tips.string = tipstring;
                    this.getNoFish(); 
                }
            }
        }

    }
    afterPull(){
        this.setCurEatType(eatType.impulse);
        this._isTryEat = false;
        this._isBlockEat = false;
        this._robState = robState.prepare;
        
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
                // this.tips.string = "catch fish !";
                this.fishAnim.playAdditive("fishInBasket");
                var fishType = this.getfishDefaultAnim();
                this.createFishJumpClip(fishType.name, fishType.frames);

                DataManager.catchFish();
                break;
            case "pullRobNoFish":
                // this.tips.string = "fish going !";
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
        // this.sinker.node.

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
    polygonArea(points)  
    {  
        var i, j;  
        var area = 0;  
        for (i = 0; i < points.length; i++)  
        {  
            j = (i + 1) % points.length;  
            area += points[i].x * points[j].y;  
            area -= points[i].y * points[j].x;  
        }  
        area /= 2;  
        return Math.abs(area);  
    }
    setSinkerMass(m){

        var t = this.sinker.node.getComponent(cc.PhysicsPolygonCollider);
        var b = this.sinker.node.getComponent(cc.RigidBody);
        var area = this.polygonArea(t.points);
        var buoy = this.buoy.node.getComponent(cc.PhysicsPolygonCollider);

        cc.log("points",t.points,"density:", t.density, "mass:",b.getMass(),"area:",area/100,"mass:",area/100 * t.density);
        cc.log("buoy: area:",this.polygonArea(buoy.points));
        // Simulator: points (-2.50, 5.00),(-2.50, -5.00),(2.43, -4.85),(2.42, 5.11)
        // t.points = [cc.p(-2.50, 10.00),cc.p(-2.50, -5.00),cc.p(2.43, -4.85),cc.p(2.42, 10)];
        var w=10;
        var nmass = m + area/100 * t.density;
        if (nmass <= 1) {
            this.tips.string ="不能再减了"
            return;
        }
        cc.log("铅坠:"+nmass +" g");
        this.tips.string = "铅坠:"+nmass +" g"
        var h= nmass / t.density / (w / 10) * 10;
        cc.log("h",h)
        t.points=[cc.p(-w/2,-h/2),cc.p(w/2,-h/2),cc.p(w/2,h/2),cc.p(-w/2,h/2)];
        t.apply();
        cc.log("points",t.points)
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
                // this.hook.applyForce(cc.v2(0,-800), this.hook.getWorldCenter(),true);
                break;
            case 2:
                //为刚体添加速度
                this.hook.applyLinearImpulse(vector, this.hook.getWorldCenter(),true);
                break;
            case 3:
                //唤醒刚体
                // this.hook.wakeUp();
                //设置刚体的线性速度
                // this.hook.linearVelocity = vector;
                this.hook.applyForce(vector, this.hook.getWorldCenter(),true);
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
        var rdm = Utils.getRandomInt(0, this._fishDefaultAnim.length - 1);
        return this._fishDefaultAnim[rdm];
    }
    /**
     * 获取随机 鱼咬钩动作的数据
     */
    getEatAnimData() {
        if (this._eatAnim == null || this._eatAnim == undefined) {
            this._eatAnim = DataManager.getBaseData("eatAnim", null);
        }
        var rdm = Utils.getRandomInt(0, this._eatAnim.length - 1);
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
        this._unbrokenTime = 0;
        //试探
        if(this._isTryEat && this._tryEatTimes > 0){
            this.tips.string = "试探..";  
            this._tryEatTimes --;
            // 试 冲
            var impulse = this._curFishImpulse.mul(this._rateTryEatForce * this._rateTryEatTime * this._rateBlockEatForce * this._rateBlockEatTime);
            this.hook.applyLinearImpulse( impulse, this.hook.getWorldCenter(),true);
            this.tips.string = "试探..冲";
            cc.log("try:",this._isTryEat,"impulse:",impulse);
            // 试 持续力
            this.setCurEatType(eatType.force);
            
        }else{
            this.tips.string = "进食..";  
            // 结束试探
            this.hook.applyLinearImpulse(this._curFishImpulse, this.hook.getWorldCenter(),true); 
            this.tips.string = "冲";                       
            cc.log("try:",this._isTryEat,"impulse:",this._curFishImpulse);
             //持续力阶段
            this.setCurEatType(eatType.force);
        }
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
            // 1. 是否试探
            this._isTryEat = this._curFish["tryEat"] >= rate_tryEat;
            this._isTryEat = true;
            //力
            var suction = this.getSuction(fish.weight);
            var vector = this.getVector();

            // 试探力系数
            this._rateTryEatForce = this._isTryEat ? rate_tryEatForce : 1;
            this._rateTryEatTime = this._isTryEat ? rate_tryEatForceTime : 1;
            cc.log("是否试探:",this._isTryEat,"试探力系数:"+this._rateTryEatForce,"试探时间系数:"+this._rateTryEatTime);
            if (this._isTryEat) {
                this._tryEatTimes = Utils.getRandomInt(1,tryEatMaxTimes);
                cc.log("试探次数:",this._tryEatTimes);
            }

            // 2. 是否挡口 (根据 钩号 和鱼重比)
            this._isBlockEat = Utils.getRandomInt(0,100) > 50;
            this._rateBlockEatForce = this._isBlockEat ? rate_blockEatForce : 1;
            this._rateBlockEatTime = this._isBlockEat ? rate_blockEatForceTime : 1;
            cc.log("是否挡口(随机):",this._isBlockEat,"挡口力系数:"+ this._rateBlockEatForce,"挡口时间系数:"+this._rateBlockEatTime);
           
            // this._curFishForce = vector.mulSelf(suction * this._rateTryEatForce * this._rateBlockEatForce)
            // this._curFishImpulse = vector.mulSelf(suctionTime * suction * this._rateTryEatForce * this._rateBlockEatForce);
            
            this._curFishForce = vector.mul(suction)
            this._curFishImpulse = vector.mul(suctionTime * suction);

            cc.log("鱼重",fish.weight/1000+" KG","冲量:",this._curFishImpulse,"持续力:",this._curFishForce);
            // this._curFishForce = cc.v2(vector.x * suction * tryEat, vector.y * suction * tryEat);
            // this._curFishImpulse = cc.v2(vector.x * suction * tryEat * suctionTime, vector.y * suction * tryEat * suctionTime);
        }else{
            this._curFish = fish;
            this._curFishForce = cc.v2();
            this._curFishImpulse = cc.v2();
        }
    }
    // 持续力的时间(试探)
    getUnBrokenTryTime(){
        return eatTime * this._rateTryEatTime * this._rateBlockEatTime;
    }

    // 持续力的时间(试探)
    getUnBrokenTime(){
        return eatTime;
    }
    updateDistance(dt) {
        // cc.log(Date.now(),dt);
        //位置更新
        if (this._robState == robState.robPush ){
            DataManager.updateDistance(dt, this._curNestBait["allure"] || 0, this._curBaitLure)
        }
        //窝料更新
        DataManager.updateNestBait()
    }
    update(dt) {
        // 抛竿后 检测鱼
        if (this._robState == robState.robPush && !this._curFish) {

            if (this._immuneTime > 0) {
                this._immuneTime = this._immuneTime - dt;
                // cc.log("鱼群免疫诱惑期..", this._immuneTime);
                // this.tips.string = "鱼群免疫诱惑期..", this._immuneTime;
                return;
            }
            if (this._immuneTime <= 0) {
                this._immuneTime = 0;
                cc.log("免疫诱惑结束,正在检测鱼情");
                this.tips.string = "免疫诱惑结束,正在检测鱼情.."
            }

            if (DataManager.getPrepareEatFish()) {
                cc.log("已检测到鱼");
                this.tips.string = "已检测到附近有鱼接近..";
                var fish = DataManager.getPrepareEatFish();
                this.updateFish(fish);
                // 启动吃饵过程
                this.progressEat();
            }
        }
        // 持续力
        if (this._curEatType == eatType.force) {
            var time = this._isTryEat ? this.getUnBrokenTryTime() : this.getUnBrokenTime();
            if(this._unbrokenTime < time){
                this._unbrokenTime += dt;
                var temp = this._curFishForce.mul(this._rateTryEatForce * this._rateBlockEatForce);
                var force = this._isTryEat ?  temp : this._curFishForce
                this.hook.applyForce( force , this.hook.getWorldCenter(),true);

                if(this._isTryEat){
                    this.tips.string = "持续试探.."+(this._tryEatTimes +1) +"次";                
                }else{
                    this.tips.string = "进食中..";                
                }
                cc.log("try:",this._isTryEat,"持续施加力..",force, "time:",time)
            }else{
                this.setCurEatType(eatType.impulse);
                cc.log("停止施加持续力,类型为冲量")
                if (this._isTryEat && this._tryEatTimes > 0) {
                    cc.log("next try");
                    this.tips.string = "再次试探";  
                    this.progressEat();
                }else if(this._isTryEat && this._tryEatTimes == 0){
                    cc.log("end try")
                    this.tips.string = "结束试探";  
                    this._isTryEat = false;
                    this.progressEat();
                }else if( !this._isTryEat ){
                    this.tips.string = "结束进食";  
                    cc.log("end all")
                }
            }
        } 
       
    }

    applyForce(dt){
        cc.log("force")
         // 持续力
        // if (this._curEatType == eatType.force) {
            // cc.log("持续施加力..")
            this._unbrokenTime += dt;

            if (this._isTryEat) {
                if(this._unbrokenTime < this.getUnBrokenTryTime()){
                    this.hook.applyForce(this._curFishForce.mul(this._rateTryEatForce * this._rateBlockEatForce), this.hook.getWorldCenter(),true);
                }else{
                    this.unschedule(this.applyForce);
                    cc.log("end schedule");
                    setTimeout(function() {
                        
                        this._unbrokenTime  = 0;
                        if (this._tryEatTimes > 0) {
                            cc.log("next")
                            this.tryEatAction();
                        }
                    }.bind(this), 1000);
                }
            }else{

                if(this._unbrokenTime < this.getUnBrokenTime()){
                    this.hook.applyForce(this._curFishForce, this.hook.getWorldCenter(),true);
                }else{
                    this.unschedule(this.applyForce);
                    cc.log("end schedule");
                    this._unbrokenTime  = 0;
                }
            }
        // }
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
            case "add1g":
                this.setSinkerMass(1);
                break;
            case "sub1g":
                this.setSinkerMass(-1);
                break;
        }
    }
}
