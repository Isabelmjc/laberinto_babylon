var camara, canvas, contexto, entorno;
var escena;
var posCamaraLaberinto;
var rotacionCamaraLaberinto;
//El laberinto se hace a base de bloques, de cubos. Pongamos que cada bloque tiene un tamaño de 8
var TAMA_BLOQUE = 8;

var laberinto;
var dimensionMatriz;
var horas;
var minutos;
var segundos;

var jugador;

var coord_x_Salida=0.0;
var coord_y_Salida=0.0;

var vistaAerea=false;

//FUNCIONES PARA LA LECTURA DE MAPAS
function cargarMapa(evt) {
    var fichero = document.getElementById('cargaMapa').files[0];
    if(fichero)
    {
        var leerFichero = new FileReader();
        leerFichero.onload = function(){
            var laberintoTexto = leerFichero.result;
            var dimensionesMapa = calcularDimensionesMapa(laberintoTexto);
            laberinto = new Array(dimensionesMapa[0]);
            var filasMapa = laberintoTexto.split("\n");
            dimensionMatriz=filasMapa.length;
            for(var i=0; i<dimensionesMapa[0];i++){
                laberinto[i]= new Array(dimensionesMapa[0]);
                var columnasIMapa = filasMapa[i].split(",");
                for(var j=0; j<dimensionesMapa[1];j++){
                    laberinto[i][j]=columnasIMapa[j];
                }
            }
        }
        leerFichero.readAsText(fichero);
        
    }
}
/*
El fichero de texto es simple, cada fila esta compuesta por números separados por comas
una fila se diferencia de otra por el caracter salto de línea \n
*/
//Calcula las dimensiones del mapa, necesitamos saber filas y columnas
function calcularDimensionesMapa(texto){
    var filas = texto.split("\n");
    var totalFilas = filas.length;
    var totalColumnas = calcularColumnas(filas[0]);
    var dimensiones = [totalFilas, totalColumnas];
    return dimensiones;
}
//Calcula las columnas de una fila dividida por comas (,)
function calcularColumnas(fila){
    var columnas = fila.split(",");
    return columnas.length;
}
//FIN DE FUNCIONES DE LECTURA DE MAPAS


//FUNCIÓN PARA LA CREACIÓN DEL LABERINTO
function crearEscena() {
    
    var mCount = dimensionMatriz;
    var filas = 15;
	var columnas = 20;

    //Aquí creamos la escena y aplicamos gravedad a la misma. Además controlamos las colisiones
    escena = new BABYLON.Scene(contexto);
    //Para que sea realista a la escena se le debe aplicar gravedad. La gravedad se representa con un vector de 3 valores para x, y, z.
    //La gravedad afecta a la y. Debemos ponerla negativa para que el efecto sea hacia abajo.
    escena.gravity = new BABYLON.Vector3(0, -9.81, 0);
    //Esto hace que si chocan dos objetos se tenga en cuenta la colisión y no atraviese uno a otro
    escena.collisionsEnabled = true;

    //A continuación creamos la cámara y le aplicamos las características adecuadas
    //La cámara es una FreeCamera, una FreeCamera es aquella que controla el usuario, ya sea con el ratón
    //Con las teclas de flecha o con las teclas 'w', 'a', 's' y 'd'
    camara = new BABYLON.FreeCamera("camaraLibre", new BABYLON.Vector3(0, 5, 0), escena);
    
    camara.minZ = 1; 
    
    //ellipsoid --> Elipsoide en una zona que rodea a la camara y que en función a ella se controlan las colisiones
    //Es decir, si un objeto entra en el elipsoide de la camara se da cuenta de que se ha producido una colisión
    camara.ellipsoid = new BABYLON.Vector3(1, 1, 1);
    //Cuando se establece el elipsoide ya se tiene que indicar que la camara va a detectar colisiones con esta propiedad
    camara.checkCollisions = true;
    camara.applyGravity = true;
    escena.activeCamera = camara;
    camara.attachControl(canvas);
    escena.activeCamera = camara;

    

    //Generación del suelo y el material que usaremos para este
    //Generación en primer lugar del material
    var materialSuelo = new BABYLON.StandardMaterial("materialSuelo", escena);
    
    materialSuelo.emissiveTexture  =  new  BABYLON.Texture ( "texturas/suelo.jpg " , escena);

    // Generación del suelo
    //A la hora de generar el suelo debemos especificar el nombre, el ancho, profundidad y la escena a la que pertenece
    var suelo = BABYLON.Mesh.CreateGround("suelo", (mCount + 2) * TAMA_BLOQUE, 
                                                     (mCount + 2) * TAMA_BLOQUE, 
                                                      1, escena, false);
    suelo.material = materialSuelo;
    suelo.checkCollisions = true;

      

    //Crea una luz direccional
    var luz = new BABYLON.DirectionalLight("luzDireccional", new BABYLON.Vector3(0,-1,0),escena);
    luz.diffuse = new BABYLON.Color3(1, 0, 0); //Vamos a poner la luz de color roja
    luz.intensity = 0.2; //Intensidad de la luz

    //En esta parte crearemos un cubo y el material base del que estará compuesto
    //Este cubo será el que usaremos para realizar el laberinto, ya que este no es más que un
    //conunto de cubos colocados uno a lado de otro
	var materialCubo = new BABYLON.StandardMaterial("materialCubo", escena);
	
    materialCubo.emissiveTexture  =  new  BABYLON.Texture ( "texturas/ladrillos.jpg " , escena);
	
	
    var cuboBase = BABYLON.Mesh.CreateBox("cuboBase", TAMA_BLOQUE, escena);
	cuboBase.material = materialCubo;
	
	cuboBase.subMeshes = [];
	cuboBase.subMeshes.push(new BABYLON.SubMesh(0, 0, 4, 0, 6, cuboBase));
	cuboBase.subMeshes.push(new BABYLON.SubMesh(1, 4, 20, 6, 30, cuboBase));
	cuboBase.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, -Math.PI / 2, 0);
	cuboBase.checkCollisions = true;
	cuboBase.setEnabled(false);


    //Vamos a poner carteles en algunos de los cubos para que el usuario pueda a través de ellos ubicarse en el 
    //laberinto y no vea siempre todo igual. Usaremos tres carteles que se colocaran cada cierto número de cubos.
    var carteles = ["texturas/cartel01.jpg","texturas/cartel02.jpg","texturas/cartel03.jpg"];
    var texturaCartelUsada=0;

    //Además el laberinto consta de una serie de objetos colocados en diferentes posiciones con el mismo material
    //Es aquí donde se define este
    var materialObj = new BABYLON.StandardMaterial("materialJugador", escena);
    materialObj.diffuseColor = new BABYLON.Color3(0, 1, 0);
    materialObj.emissiveColor = new BABYLON.Color3(0, 0, 0);
    materialObj.specularColor = new BABYLON.Color3(1, 1, 1);


    //Comenzamos la generación del laberinto recorriendo el fichero la matriz generada a partir del fichero de mapa leido con anterioridad
    //Se colocan cubos formando la estructura y objetos o carteles según corresponda. Se puede observar el conjunto de elementos
    //condicionales incluidos en el bucle
	for (var filas = 0; filas < mCount; filas++) {
	    for (var columnas = 0; columnas < mCount; columnas++) {
	        if (laberinto[filas][columnas]==1) {
            cubo = cuboBase.clone("nuevoCubo" + filas + columnas);
                if(columnas%25==0 && filas%5==0)
                {
                    var matCartel=new BABYLON.StandardMaterial("matCartel", escena);
    
                    matCartel.emissiveTexture  =  new  BABYLON.Texture ( carteles[texturaCartelUsada] , escena);
                    texturaCartelUsada++;
                    if(texturaCartelUsada>2){
                        texturaCartelUsada=0;
                    }
                    cubo.material = matCartel;
                }
            cubo.position = new BABYLON.Vector3(TAMA_BLOQUE / 2 + (filas - (mCount / 2)) * TAMA_BLOQUE,
                                                TAMA_BLOQUE / 2,
                                                TAMA_BLOQUE / 2 + (columnas - (mCount / 2)) * TAMA_BLOQUE);
        	}
            else if(laberinto[filas][columnas]==2){
                //Se dibuja un cubo pequeño
                var objCaja = BABYLON.Mesh.CreateBox("objCaja", 5.0, escena);
                objCaja.material = materialObj;
                objCaja.checkCollisions = true;
                objCaja.position = new BABYLON.Vector3(TAMA_BLOQUE / 2 + (filas - (mCount / 2)) * TAMA_BLOQUE,
                                                TAMA_BLOQUE / 2,
                                                TAMA_BLOQUE / 2 + (columnas - (mCount / 2)) * TAMA_BLOQUE);
            }
            else if(laberinto[filas][columnas]==3){
                //Se dibuja una esfera
                var objEsfera = BABYLON.Mesh.CreateSphere("sphere", 10.0, 10.0, escena);
                objEsfera.material = materialObj;
                objEsfera.checkCollisions=true;
                objEsfera.position = new BABYLON.Vector3(TAMA_BLOQUE / 2 + (filas - (mCount / 2)) * TAMA_BLOQUE,
                                                TAMA_BLOQUE / 2,
                                                TAMA_BLOQUE / 2 + (columnas - (mCount / 2)) * TAMA_BLOQUE);
            }
            else if(laberinto[filas][columnas]=='E'){
                //Indica Entrada un cilindro con una E
                var entrada = BABYLON.Mesh.CreateBox("cajaEntrada", TAMA_BLOQUE, escena);
                var materialEntrada = new BABYLON.StandardMaterial("materialEntrada", escena);
                materialEntrada.emissiveTexture  =  new  BABYLON.Texture ( "texturas/entrada.png " , escena);
                entrada.material = materialEntrada;
                entrada.checkCollisions = true;
                entrada.position = new BABYLON.Vector3(TAMA_BLOQUE / 2 + (filas - (mCount / 2)) * TAMA_BLOQUE,
                                                TAMA_BLOQUE / 2,
                                                TAMA_BLOQUE / 2 + (columnas - (mCount / 2)) * TAMA_BLOQUE);
                
                var x = TAMA_BLOQUE / 2 + (filas - (mCount / 2)) * TAMA_BLOQUE;
                var y = TAMA_BLOQUE / 2 + ((columnas-2) - (mCount / 2)) * TAMA_BLOQUE;
                camara.position = new BABYLON.Vector3(x, 5, y);
            }
            else if(laberinto[filas][columnas]=='S'){
                //Indica que hemos llegado a la salida
                var salida = BABYLON.Mesh.CreateBox("cajaSalida", TAMA_BLOQUE, escena);
                var materialSalida = new BABYLON.StandardMaterial("materialSalida", escena);
                materialSalida.emissiveTexture  =  new  BABYLON.Texture ( "texturas/salida.png " , escena);
                salida.material = materialSalida;
                salida.checkCollisions = true;
                salida.position = new BABYLON.Vector3(TAMA_BLOQUE / 2 + (filas - (mCount / 2)) * TAMA_BLOQUE,
                                                TAMA_BLOQUE / 2,
                                                TAMA_BLOQUE / 2 + (columnas - (mCount / 2)) * TAMA_BLOQUE);
                coord_x_Salida = salida.position.x;
                coord_y_Salida = salida.position.y;
            }
	    }
	}

    //Generación del jugador, representado por un cubo de color rojo. Al comenzar se coloca justo en la entrada
    //Al igual que la cámara
    jugador = BABYLON.Mesh.CreateBox("box", 4.0, escena);
    var materialJugado = new BABYLON.StandardMaterial("materialJugador", escena);
    materialJugado.diffuseColor = new BABYLON.Color3(1, 0, 0);
    materialJugado.emissiveColor = new BABYLON.Color3(1, 0.2, 0.2);
    materialJugado.specularColor = new BABYLON.Color3(1, 1, 1);
    jugador.material = materialJugado;
    jugador.position = camara.position;


    return escena;
};

//FUNCIONES ASOCIADAS A LOS BOTONES DE LA PÁGINA
//Función para el botón Seleccionar archivo que cargará el mapa elegido en memoria
document.getElementById("cargaMapa").onchange = function () {
    cargarMapa();
};

//Función para el botón Comenzar juego que iniciará este generando la escena
document.getElementById("inicio").onclick = function () {
    canvas = document.getElementById("canvas");
    contexto = new BABYLON.Engine(canvas, true);

    //Al comenzar el juego debe iniciarse el cronómetro, por eso se cargan las variables para el reloj y se llama a la función cronómetro
    horas = 0;
    minutos = 0;
    segundos = 0;
    cronometro();

    window.addEventListener("resize", function () {
        contexto.resize();
    });

    entorno = crearEscena();
    
    entorno.activeCamera.attachControl(canvas);

    contexto.runRenderLoop(function () {
        if(camara.position.x == (coord_x_Salida + TAMA_BLOQUE) || camara.position.y == (coord_y_Salida + TAMA_BLOQUE)){
                alert("Tiempo transcurrido para la finalización del recorrido: " + horas + ":" + minutos + ":" + segundos);
        }
        entorno.render();
    });
};

//Función para el botón Instrucciones. Muestra un fichero PDF con instrucciones claras para comenzar a jugar
document.getElementById("botonAyuda").onclick = function (){
    window.open("instrucciones/instrucciones.pdf","Instrucciones");
}

//Función para el botón Vista superior/vista normal que permite ver el laberinto desde arriba y conocer la ubicación del jugador
document.getElementById("vistaSuperior").onclick = function (){
    if (!vistaAerea) {
            vistaAerea = true;
            //Guardamos la posición de la cámara cuando volvamos a la vista normal
            posCamaraLaberinto = camara.position;
            
            //Colocación de la posición del jugador
            jugador.position = camara.position;

            rotacionCamaraLaberinto = camara.rotation;
            cambioVistaAerea(camara.position,
                new BABYLON.Vector3(16, 400, 15),
                camara.rotation,
                new BABYLON.Vector3(1.4912565104551518, -1.5709696842019767,camara.rotation.z));
        }
        else {
            vistaAerea = false;
            cambioVistaAerea(camara.position,
                posCamaraLaberinto, camara.rotation, rotacionCamaraLaberinto);
        }
        camara.applyGravity = !vistaAerea;
}


var cambioVistaAerea = function (posLaberinto, posAerea,
                                                 rotacionLaberinto, rotacionAerea) {

    var camaraAerea = new BABYLON.Animation("camaraAerea", "position", 30,
                              BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
                              BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    var posiciones = [];
    posiciones.push({
        frame: 0,
        value: posLaberinto
    });
    posiciones.push({
        frame: 100,
        value: posAerea
    });

    camaraAerea.setKeys(posiciones);

    var camaraAereaRotacion = new BABYLON.Animation("camaraAereaRotacion", "rotation", 30,
                              BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
                              BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    var rotaciones = [];
    rotaciones.push({
        frame: 0,
        value: rotacionLaberinto
    });
    rotaciones.push({
        frame: 100,
        value: rotacionAerea
    });

    camaraAereaRotacion.setKeys(rotaciones);
    camara.animations.push(camaraAerea);
    camara.animations.push(camaraAereaRotacion);

    escena.beginAnimation(camara, 0, 100, false);
};


function cronometro(){
    var t_Horas;
    var t_Minutos;
    var t_Segundos;

    if (segundos < 59){
        segundos = segundos + 1;
    }
    else{
        segundos = 0;
        if(minutos < 59)
            minutos = minutos + 1;
        else{
            minutos = 0;
            if (horas < 24){
                horas = horas + 1;
            }
            else{
                horas = 0;
            }
        }
    }
        
    t_Horas = horas;
    t_Minutos = minutos;
    t_Segundos = segundos;

    if (horas < 10) {t_Horas = '0' + t_Horas;}
    if (minutos < 10) {t_Minutos = '0' + t_Minutos;}
    if (segundos < 10) {t_Segundos = '0' + t_Segundos;}

    document.getElementById("reloj").innerHTML = t_Horas+':'+ t_Minutos+':'+ t_Segundos;

    setTimeout(cronometro, 1000);

}