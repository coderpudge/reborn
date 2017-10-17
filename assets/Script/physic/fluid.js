
function inside(cp1,cp2,p){
    // cc.log("inside");
    return (cp2.x-cp1.x)*(p.y-cp1.y) > (cp2.y-cp1.y)*(p.x-cp1.x);
}

function intersection(cp1,cp2,s,e){
    // cc.log("intersection");
    let dc = cc.p(cp1.x-cp2.x, cp1.y-cp2.y);
    let dp = cc.p(s.x-e.x, s.y-e.y);
    let n1 = cp1.x*cp2.y - cp1.y*cp2.x;
    let n2 = s.x * e.y - s.y * e.x;
    let n3 = (dc.x * dp.y - dc.y * dp.x);
    return cc.p((n1*dp.x-n2*dc.x)/n3, (n1*dp.y-n2*dc.y)/n3);
}

function computeAC(vs){
    // cc.log("computeAC");
    let count=vs.length;
    var c = cc.p(0,0);
    var area = 0.0;
    var p1X = 0.0;
    var p1Y = 0.0;
    var inv3 = 1.0 / 3.0;
    for (var i = 0; i < count; ++i) {
        var p2 = vs[i];
        var p3 = i + 1 < count ? vs[i + 1] : vs[0];
        var e1X = p2.x - p1X;
        var e1Y = p2.y - p1Y;
        var e2X = p3.x - p1X;
        var e2Y = p3.y - p1Y;
        var D = (e1X * e2Y - e1Y * e2X);
        var triangleArea = 0.5 * D;area += triangleArea;
        c.x += triangleArea * inv3 * (p1X + p2.x + p3.x);
        c.y += triangleArea * inv3 * (p1Y + p2.y + p3.y);
    }


    return [area,c];
}

cc.Class({
    extends: cc.Component,

    properties: {
        density:1,
        linearDrag:1,
        angularDrag:1
    },

    // use this for initialization
    onLoad: function () {
        this.createFluid();
        this.inFluid=[];
        this.physicManager=cc.find('Canvas/physicManager').getComponent('physicManager');
        this.gravity=cc.p(this.physicManager.gravity.x,-this.physicManager.gravity.y);

    },
    
    findIntersectionAreaAndCentroid(body){
        // cc.log("findIntersectionAreaAndCentroid");
        var fixtureB=body.GetFixtureList();
        if(!fixtureB||fixtureB.GetType()!==2){
            return;
        }
        var centroid=cc.p(0,0);
        var area=0;
        var mass=0;
        var intersectionPoints = [];
        while(fixtureB){
            var outputList=this.getVertices(this.fluidBody);
            var clipPolygon=this.getVertices(body);
            
            var cp1=clipPolygon[clipPolygon.length-1];
            for (var j=0;j<clipPolygon.length;j++) {
                var cp2 = clipPolygon[j];
                var inputList = outputList;
                outputList = [];
                let s = inputList[inputList.length - 1]; //last on the input list
                for (var i=0;i<inputList.length;i++) {
                    var e = inputList[i];
                    if (inside(cp1,cp2,e)) {
                        if (!inside(cp1,cp2,s)) {
                            outputList.push(intersection(cp1,cp2,s,e));
                        }
                        outputList.push(e);
                    }
                    else if (inside(cp1,cp2,s)) {
                        outputList.push(intersection(cp1,cp2,s,e));
                    }
                    s = e;
                }
                cp1 = cp2;
            }
            
            let ac=computeAC(outputList);
            var density=fixtureB.GetDensity();
            mass+=ac[0]*density;
            area+=ac[0];

            //centroid.addSelf(ac[1].mul(density));
            centroid.x+=ac[1].x*density;
            centroid.y+=ac[1].y*density;
            fixtureB=fixtureB.GetNext();
            intersectionPoints = outputList;
        }

        centroid.mulSelf(1/mass);
        // cc.log("area:",area,"points:",intersectionPoints)
        return [area,centroid,intersectionPoints];
        
    },

    createFluid(){
        // cc.log("createFluid");
        var body=this.node.addComponent(cc.RigidBody);
        body.type=0;
        body.enabledContactListener=true;
        var polygonCollider=this.node.addComponent(cc.PhysicsPolygonCollider);
        var w=this.node.width/2;
        var h=this.node.height/2;
        polygonCollider.points=[cc.p(-w,-h),cc.p(w,-h),cc.p(w,h),cc.p(-w,h)];
        polygonCollider.sensor=true;
        polygonCollider.density=this.density;
        polygonCollider.apply();
        this.fluidBody=body._b2Body;
    },



    onBeginContact(contact, selfCollider, otherCollider) {
        // cc.log("onBeginContact");
        let bodyB=otherCollider.body._b2Body;
        this.inFluid.push(bodyB);
        contact.disabled = true;
        var worldp = contact.getWorldManifold()
        
    },

    onEndContact(contact,selfCollider,otherCollider){
        // cc.log("onEndContact");
        let bodyB=otherCollider.body._b2Body;
        let index=this.inFluid.indexOf(bodyB);
        this.inFluid.splice(index,1);
        contact.disabled = true;
    },

    applyBuoyancy(body){
        var AC=this.findIntersectionAreaAndCentroid(body);//get the area and centroid
        if(AC[0]!==0){
            var mass=AC[0]*this.density;
            var centroid=AC[1];
            var buoyancyForce=new b2.Vec2(mass*this.gravity.x,mass*this.gravity.y);

           
            body.ApplyForce(buoyancyForce,centroid,true);
            var velDir1=body.GetLinearVelocityFromWorldPoint(centroid);
            if (velDir1.y == 0) {
                cc.log("fuli:",buoyancyForce)
                // this.hook.applyForce(vector, this.hook.getWorldCenter(),true);
            }
            var velDir2=this.fluidBody.GetLinearVelocityFromWorldPoint(centroid);
            var velDir=cc.pSub(velDir1,velDir2);
            var dragMag=this.density*this.linearDrag*mass;
            var dragForce=velDir.mulSelf(-dragMag);
            body.ApplyForce(dragForce,centroid,true);
            var torque=-body.GetInertia()/body.GetMass()*mass*body.GetAngularVelocity()*this.angularDrag;
            // cc.log("torque:",torque)
            body.ApplyTorque(torque,true);
        }

        // let AC=this.findIntersectionAreaAndCentroid(body);//get the area and centroid
        // if(AC[0]!==0){
        //     let mass=AC[0]*this.density;
        //     let centroid=AC[1];
        //     let buoyancyForce=new b2.Vec2(mass*this.gravity.x,mass*this.gravity.y);
        //     // cc.log("ac1",centroid)
        //     body.ApplyForce(buoyancyForce,centroid,true);

        //     // var velDir1= cc.Vec2();
        //     let velDir1 = body.GetLinearVelocityFromWorldPoint(centroid);
         
        //     // var velDir2= cc.Vec2();
        //     let velDir2=this.fluidBody.GetLinearVelocityFromWorldPoint(centroid);
        //     // cc.log("velDir", velDir1, velDir2);
        //     // var velDir = body.GetLinearVelocityFromWorldPoint(centroid).operator -=(this.fluidBody.GetLinearVelocityFromWorldPoint(centroid));
        //     // var velDir = cc.Vec2();
        //     let velDir = cc.pSub(velDir1,velDir2);
        //     // velDir1.operator -=(velDir2);
        //     // cc.log("velDir", velDir);
        //     let dragMag=this.density*this.linearDrag*mass;
        //     // velDir1.operator*=(-dragMag);
        //     // var dragForce=velDir1;
        //     let dragForce=cc.pMult(velDir,-dragMag);
            
        //     body.ApplyForce(dragForce,centroid,true);

        //     let torque=-body.GetInertia()/body.GetMass()*mass*body.GetAngularVelocity()*this.angularDrag;
        //     body.ApplyTorque(torque,true);
        // }
        // if(AC[0]!==0){
        //     let mass=AC[0]*this.density;
        //     let centroid=AC[1];
        //     for (let i = 0; i < AC[2].length; i++) {
        //         let v0 = AC[2][i];
                
        //         let v1 = AC[2][(i+1)%AC[2].length];
        //         let vsum = v0.add(v1);
        //         let midPoint =  vsum.mul(0.5) ;
        //         let velDir = body.GetLinearVelocityFromWorldPoint(midPoint);
        //         let  vel = cc.v2(velDir.x,velDir.y).mag();
        //         let edge = cc.pSub(v1,v0);
        //         let edgeLength = edge.mag()
        //         let normal = cc.v2( edge.y * -1, edge.x * 1);
        //         let dragDot = cc.pDot(normal,velDir);
        //         // var D = (e1X * e2Y - e1Y * e2X);
        //         if (dragDot < 0) {
        //             continue;
        //         }
        //         var dragMag = dragDot * edgeLength * this.density * vel * vel ;
        //         var dragForce = cc.v2(velDir.x,velDir.y).mul(dragMag);
        //         body.ApplyForce(dragForce,midPoint);
                
        //     }
        // }
    },


    getVertices(body){
        var shape=body.GetFixtureList().GetShape();
        var vertices=[];
        for(var i=0;i<shape.GetVertexCount();i++){
            vertices.push(body.GetWorldPoint(shape.GetVertex(i)));
        }
        // cc.log("getVertices",vertices.length);        
        return vertices;
    },


    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        for(var i=0,l=this.inFluid.length;i<l;i++){
            this.applyBuoyancy(this.inFluid[i]);
        }
    },
});
