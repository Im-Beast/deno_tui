// Copyright 2022 Im-Beast. All rights reserved. MIT license.
// Example of creating your own component by extending provided ones

import { BoxComponent } from '../src/components/box.ts'
import { crayon } from 'https://deno.land/x/crayon@3.3.2/mod.ts'

import { 
    handleKeypresses , handleMouseControls , 
    PlaceComponentOptions , Tui 
} from '../mod.ts'



const tui = new Tui({ style : crayon.bgBlack.white });

tui.dispatch();

handleKeypresses(tui);
handleMouseControls(tui);


class DraggableBoxComponent extends BoxComponent {
    
    offset : number []
    
    constructor ( options : PlaceComponentOptions ){
        
        super(options);

        tui.on('mousePress',({ drag , x , y }) => {
        
            if(this.state === 'base')
                return
        
            const { rectangle , offset } = this;
            
            if(drag){
                rectangle.column = x - offset.x;
                rectangle.row = y - offset.y;
                return;
            }

            this.offset = {
                x : x - rectangle.column ,
                y : y - rectangle.row
            }
        });
    }
    
    // Make component interactable
    
    interact() : void {
        this.state = 'focused';
    }
}


function spawnBox ({ place , color }){
    
    const 
        [ base , focused ] = color ,
        [ x , y , z ] = place ;
    
    new DraggableBoxComponent({ tui ,
        
        zIndex : z ,
        
        theme : {
            focused : crayon[focused] , 
            base : crayon[base]
        },
        
        rectangle : {
            
            height : 3 ,
            width : 6 ,
            
            column : x ,
            row : y
        }
    });
}


spawnBox({
    color : [ 'bgBlue' , 'bgLightBlue' ] ,
    place : [ 1 , 1 , 0 ]
})

spawnBox({
    color : [ 'bgYellow' , 'bgLightYellow' ] ,
    place : [ 1 , 1 , 1 ]
})

spawnBox({
    color : [ 'bgMagenta' , 'bgLightMagenta' ] ,
    place : [ 1 , 1 , 2 ]
})

spawnBox({
    color : [ 'bgGreen' , 'bgLightGreen' ] ,
    place : [ 1 , 1 , 3 ]
})


tui.run();
