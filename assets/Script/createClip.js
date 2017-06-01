const {ccclass, property} = cc._decorator;

@ccclass
export default class createClip extends cc.Component {


    // use this for initialization
    onLoad() {
        var animation = this.getComponent(cc.Animation);
        
        cc.loader.loadRes("fish/baitiao", cc.SpriteAtlas, (err, atlas) => {
            var spriteFrames = atlas.getSpriteFrames();
            
            var clip = cc.AnimationClip.createWithSpriteFrames(spriteFrames, 4);
            clip.name = 'run';
            clip.wrapMode = cc.WrapMode.Loop;

            animation.addClip(clip);
            animation.play('run');
        });
    }

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
}

