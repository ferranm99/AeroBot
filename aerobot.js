 //IMPORTS
 const {Telegraf} = require('telegraf')
 const fetch = require('node-fetch');
 const {Keyboard,Key} = require('telegram-keyboard')
 const redis = require('ioredis');
 
 //BOT
 const bot = new Telegraf(process.env.BOT_TOKEN) 
 
 //DATABASE
 const DBclient = redis.createClient()
    .on('connect', () => console.log('Redis Connected WOW'))
    .on('error', err => console.log('Error ' + err))
 
 const menu_keyboard = Keyboard.make([
 	['🔎 Buscar vuelo', '🌟 Favoritos'], // First row
 	['💸 Propina', '⚙️ Ajustes'], // Second row
 ])
 
 const blankData = {
 	state: 'start',
 	data: {
 		type: 1,
 		origin: '',
 		destiny: '',
 		departureLower: '',
 		departureUpper: '',
 		arrivalLower: '',
 		arrivalUpper: '',
 		adults: 1
 	},
 	favs: []
 }
 
 var tempItems = [] //aqui guardaremos un struct tipo {user:id, items: []}
 
 bot.start((ctx) => {
 	ctx.reply('¡Hola! Me alegra verte por aquí 😊\n\nSoy un bot encargado de buscar los mejores precios de vuelos para ti. Puedes buscar el vuelo para tu próximo viaje y yo me encargaré de mirar constantemente los precios y avisarte si veo que el precio del vuelo baja. Haz click en el botón de menú para ver las distinatas opciones 👇', Keyboard.inline(['🏠 Menú']))
 })
 
 bot.hears(['Hola', 'hola', 'ola', 'HOLA'], (ctx) => {
 	ctx.reply('Hola!! Que bueno tenerte por aquí de nuevo :)')
 	console.log(ctx.message.chat.id)
 })
 
 
 bot.hears(/\bEnero|\benero|\bFebrero|\bfebrero|\bMarzo|\bmarzo|\bAbril|\babril|\bMayo|\bmayo|\bJunio|\bjunio|\bJulio|\bjulio|\bAgosto|\bagosto|\bSetiembre|\bsetiembre|\bSeptiembre|\bseptiembre|\bOctubre|\boctubre|\bNoviembre|\bnoviembre|\bDiciembre|\bdiciembre/, 
async (ctx) => {
 	try {
 		const getUser = await DBclient.get(ctx.message.chat.id);
 		var obj = JSON.parse(getUser);
        var stringDate = ctx.message.text;
        let splitted = stringDate.split(" ");
        let month = splitted[0].toLowerCase();
        let year = upper = lower = "";
        let date =  new Date();
        if(splitted.length>1) year = splitted[1];
        else year = date.getFullYear();
        
        switch(month){case 'enero':lower='01/01/'+year;upper='31/01/'+year;break;case 'febrero':lower='01/02/'+year;upper='28/02/'+year;break;case 'marzo':lower='01/03/'+year;upper='31/03/'+year;break;case 'abril':lower='01/04/'+year;upper='30/04/'+year;break;case 'mayo':lower='01/05/'+year;upper='31/05/'+year;break;case 'junio':lower='01/06/'+year;upper='30/06/'+year;break;case 'julio':lower='01/07/'+year;upper='31/07/'+year;break;case 'agosto':lower='01/08/'+year;upper='31/08/'+year;break;case 'septiembre':lower='01/09/'+year;upper='30/09/'+year;break;case 'setiembre':lower='01/09/'+year;upper='30/09/'+year;break;case 'octubre':lower='01/10/'+year;upper='31/10/'+year;break;case 'noviembre':lower='01/11/'+year;upper='30/11/'+year;break;case 'diciembre':lower='01/12/'+year;upper='31/12/'+year;break;default:lower='01/01/'+year;upper='31/01/'+year}
        
        
 		if(obj.state == "citiesOK") {
            await ctx.reply('Genial, tomo nota 📝')
            obj.state = "departureOK";
 			obj.data.departureLower = lower;
            obj.data.departureUpper = upper;
            
            if(obj.data.type == 1) ctx.reply('Perfecto!! Solamente falta que me indiques cuantas personas vais a volar, escríbemelo en un numero 👇')
 			else ctx.reply('Ahora necesitaré la fecha de vuelta. Escribela en el mismo formato (dd/mm/aaaa o un mes completo)')
            DBclient.set(ctx.message.chat.id, JSON.stringify(obj))
            
        } else if(obj.state == "departureOK" && obj.data.type == 2) {
            await ctx.reply('Genial, tomo nota 📝')
            obj.state = "arrivalOK";
 			obj.data.arrivalLower = lower;
            obj.data.arrivalUpper = upper;
            
            ctx.reply('Perfecto!! Solamente falta que me indiques cuantas personas vais a volar, escríbemelo en un numero 👇')
            DBclient.set(ctx.message.chat.id, JSON.stringify(obj))
            
        }else didntUnderstand(obj, ctx);
        
    } catch (error) {
 		console.error(error);
        errorMessage(ctx);
 	}     
 })
 
 
 //escucha lugar de salida y destino
 bot.hears(/-/, async (ctx) => {
 	try {
        
        const getUser = await DBclient.get(ctx.message.chat.id);
 		var obj = JSON.parse(getUser);
        
        if(obj.state == 'startSearch'){
            ctx.reply('Entendido, déjame comprobar estos datos')
            ctx.reply('🔎')
            
            const cities = ctx.message.text.split("-");
            const res1 = await searchLoc(cities[0], ctx);
            const res2 = await searchLoc(cities[1], ctx);
            if(res1.locations.length > 0 && res2.locations.length > 0) {
                ctx.reply('Perfecto, todo en orden 👍\nAhora necesitaria que me indicaras la fecha de salida. Esta debe estar en el siguiente formato: dd/mm/aaaa. También puedes indicar todo un mes como "Abril" (se seleccionará el año actual) o "Marzo 2024".')
                //las ciudad estan bien
                obj.state = "citiesOK";
                //aqui hay que añadir el listado de cities en el objeto
                obj.data.origin = res1.locations[0].city.code
                obj.data.destiny = res2.locations[0].city.code
                DBclient.set(ctx.message.chat.id, JSON.stringify(obj))
            } else {
                ctx.reply('Lo siento, alguna de las ciudades que has indicado no consta en la base de datos😔. ¿Podrías ser más específico? Recuerda que el formato debe ser Ciudad1 - Ciudad2');
            }    
        }else didntUnderstand(obj, ctx);
           
 	} catch (error) {
 		console.error(error);
        errorMessage(ctx);
 	}
 })
 //escucha las fechas de salida y vuelta
 bot.hears(/^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/, async (ctx) => {
 	try {
 		const getUser = await DBclient.get(ctx.message.chat.id);
 		var obj = JSON.parse(getUser);
 		if(obj.state == "citiesOK") {
            await ctx.reply('Genial, tomo nota 📝')
 			//entonces acabamos de recibir la primera fecha
 			var stringDate = ctx.message.text;
 			const ddmmyy = stringDate.split("/");
 			obj.state = "departureOK";
 			obj.data.departureLower = stringDate; //la guardamos en el objeto
 			
 			if(ddmmyy[0] < 20) obj.data.departureUpper = (parseInt(ddmmyy[0]) + 7) + '/' + ddmmyy[1] + '/' + ddmmyy[2] //+ 7 days
 			
            else if(ddmmyy[1] != '12') obj.data.departureUpper = '01/' + (parseInt(ddmmyy[1]) + 1) + '/' + ddmmyy[2] //next month 
 			
            else obj.data.departureUpper = '01/01/' + (parseInt(ddmmyy[2]) + 1)
 			
            if(obj.data.type == 1) ctx.reply('Perfecto!! Solamente falta que me indiques cuantas personas vais a volar, escríbemelo en un numero 👇')
 			else ctx.reply('Ahora necesitaré la fecha de vuelta. Escribela en el mismo formato (dd/mm/aaaa o un mes completo)')
            DBclient.set(ctx.message.chat.id, JSON.stringify(obj))
            
        } else if(obj.state == "departureOK" && obj.data.type == 2) {
            await ctx.reply('Estupendo 👍')
 			//lo mismo para el departure
 			var stringDate = ctx.message.text;
 			const ddmmyy = stringDate.split("/");
 			obj.state = "arrivalOK";
 			obj.data.arrivalLower = stringDate; //la guardamos en el objeto
 			
 			if(ddmmyy[0] < 20) obj.data.arrivalUpper = (parseInt(ddmmyy[0]) + 7) + '/' + ddmmyy[1] + '/' + ddmmyy[2] //adding 7 days
 			
            else if(ddmmyy[1] != '12') obj.data.arrivalUpper = '01/' + (parseInt(ddmmyy[1]) + 1) + '/' + ddmmyy[2] //next month 
 			
            else obj.data.arrivalUpper = '01/01/' + (parseInt(ddmmyy[2]) + 1)
 			
            ctx.reply('Perfecto!! Solamente falta que me indiques cuantas personas vais a volar, escríbemelo en un numero 👇')
            DBclient.set(ctx.message.chat.id, JSON.stringify(obj))
            
        }else didntUnderstand(obj, ctx);
        
    } catch (error) {
 		console.error(error);
        errorMessage(ctx);
 	}
 })
 bot.hears(/^[0-9]*$/, async (ctx) => {
 	try {
 		const getUser = await DBclient.get(ctx.message.chat.id);
 		var obj = JSON.parse(getUser);
 		if(obj.state == "departureOK" || obj.state == "arrivalOK") {
            ctx.reply('Este viaje pinta de maravilla 🤩. Voy a ver que puedo encontrar 🧐, un momentito...')
 			//ya tenemos toda la data para realizar la query a la API de kiwi
 			obj.data.adults = ctx.message.text
 			DBclient.set(ctx.message.chat.id, JSON.stringify(obj))
 			let res = await searchFlight(obj, ctx)
 			var count = 0;
			let onlyIDA = true
			if(obj.data.type == 2) onlyIDA = false
				
			let queryList = [] 
			while(count < res.data.length && count < 5) {
 				//enviar cada vuelo en un mensaje
				let parseRoute = getRoute(res.data[count].route, onlyIDA);
				let query = {
					price: res.data[count].price,
					departureDate: parseRoute.departureDate,
					returnDate: parseRoute.returnDate,
					origin: res.data[count].flyFrom,
					destiny: res.data[count].flyTo,
					link: res.data[count].deep_link
				}				
				queryList.push(query)

 				await ctx.replyWithHTML( '<b>OPCIÓN NÚMERO #' + (count + 1) + '</b>' + 
				'\n\nVuelo ' + res.data[count].flyFrom + ' - ' + res.data[count].flyTo + 
 				'\n💰 Precio: ' + res.data[count].price + ' EUR' + parseRoute.message + 
				'\n\n\n<a href="' + res.data[count].deep_link + '">Ver detalles</a>' , { disable_web_page_preview: true})
 				count++;
 			}
 			let ind = getTempItemsPosition(ctx.message.chat.id)
			if(ind != -1){
				tempItems[ind].items = queryList
			}
			else{
				let item = { user: ctx.message.chat.id, items: queryList }
				tempItems.push(item)
			}
 			
			//console.log(JSON.stringify(tempItems))
 			if(res.data.length > 0){
				obj.state = 'searchOK'
				ctx.reply('Ahí lo tienes 👌. Marca una de las siguientes opciones para continuar: ', 
						  Keyboard.inline([['➕ Mostrar más', '💛 Guardar en Favoritos'], ['🏠 Menú']]))
			} 
 			else{
				obj.state = 'searchKO'
				ctx.reply('Lo siento mucho, parece que no hay resultados para tu búsqueda 😢. Puedes volver al menú y probar con otras fechas o itinerario',Keyboard.inline(['🏠 Menú']) )
			} 
 			DBclient.set(ctx.message.chat.id, JSON.stringify(obj))
 		
        }else if (obj.state == "delFav"){
			//tenemos que eliminar un favorito de la lista
			let favNum = ctx.message.text - 1;
				
			if(favNum>=0 && favNum < obj.favs.length){
				obj.favs.splice(favNum, 1);
				DBclient.set(ctx.message.chat.id, JSON.stringify(obj))
				clearUserAndSetState(ctx.message.chat.id, 'start')
				await ctx.reply('Perfecto, el item número ' + (favNum+1) + ' se ha eliminado de tus favoritos👌')
				replyMenu(ctx)
			}else{
				ctx.reply('Lo siento, has introducido un número incorrecto, vuelve a probar')
			}
			
		}else if(obj.state == "addFav"){
			let favNum= ctx.message.text - 1;			
			let tempItemsUser = tempItems[getTempItemsPosition(ctx.message.chat.id)].items
			
			if(favNum>=0 && favNum < tempItemsUser.length){
				obj.favs.push(tempItemsUser[favNum])
				DBclient.set(ctx.message.chat.id, JSON.stringify(obj))
				clearUserAndSetState(ctx.message.chat.id, 'start')
				await ctx.reply('Estupendo. Tu viaje ha sido guardado a favoritos.', {reply_markup: {remove_keyboard: true}})
				replyMenu(ctx)
			}else{
				ctx.reply('Lo siento, has introducido un número incorrecto, vuelve a probar')
			}
			
		}
		
		else didntUnderstand(obj, ctx);
 	} catch (error) {
 		console.error(error);
        errorMessage(ctx);
 	}
 })
 

 
 function getRoute(route, onlyIDA){
	let idaSalidaFull = route[0].local_departure.split("T");	
	let idaSalidaDate = idaSalidaFull[0].split("-");
	idaSalidaDate = idaSalidaDate[2] + '/' + idaSalidaDate[1] + '/' + idaSalidaDate[0];
	let idaSalidaTime = idaSalidaFull[1].substring(0, 5);
		
	
	let transfersIDA = transfersVUELTA = -1;
	let result = {
		message: "",
		departureDate: "",
		returnDate: ""
	};
	
	if(onlyIDA){
		let idaLlegadaFull = route[route.length-1].local_arrival.split("T");
		let idaLlegadaDate = idaLlegadaFull[0].split("-");
		idaLlegadaDate = idaLlegadaDate[2] + '/' + idaLlegadaDate[1] + '/' + idaLlegadaDate[0];
		let idaLlegadaTime = idaLlegadaFull[1].substring(0, 5);
		
		transfersIDA = route.length-1;
		
		result.message = "\n\n🛫 VUELO DE IDA\n\n\t\t\tSalida: " + idaSalidaDate + " " +idaSalidaTime + 
		"\n\t\t\tLlegada: " + idaLlegadaDate + " " + idaLlegadaTime + "\n\t\t\tEscalas: " + transfersIDA
		
		result.departureDate = idaSalidaDate
	}else{
		let indexIdaLlegada = indexVueltaSalida = 0;
		
		let count = 0;
		while(route[count].return == 0 && count < route.length){
			indexIdaLlegada = count;
			count++;
		}
		indexVueltaSalida = count;
		transfersIDA = indexIdaLlegada;
		
		while(count < route.length){
			transfersVUELTA++;
			count++;
		}
		
		//variables de la ida
		let idaLlegadaFull = route[indexIdaLlegada].local_arrival.split("T");
		let idaLlegadaDate = idaLlegadaFull[0].split("-");
		idaLlegadaDate = idaLlegadaDate[2] + '/' + idaLlegadaDate[1] + '/' + idaLlegadaDate[0];
		let idaLlegadaTime = idaLlegadaFull[1].substring(0, 5);
		
		let ida = "\n\n🛫 VUELO DE IDA\n\n\t\t\tSalida: " + idaSalidaDate + " " +idaSalidaTime + 
		"\n\t\t\tLlegada: " + idaLlegadaDate + " " + idaLlegadaTime + "\n\t\t\tEscalas: " + transfersIDA
		
		//variables de la vuelta
		let vueltaSalidaFull = route[indexVueltaSalida].local_departure.split("T");
		let vueltaSalidaDate = vueltaSalidaFull[0].split("-");
		vueltaSalidaDate = vueltaSalidaDate[2] + '/' + vueltaSalidaDate[1] + '/' + vueltaSalidaDate[0];
		let vueltaSalidaTime = vueltaSalidaFull[1].substring(0, 5);
		
		
		let vueltaLlegadaFull = route[route.length-1].local_arrival.split("T");
		let vueltaLlegadaDate = vueltaLlegadaFull[0].split("-");
		vueltaLlegadaDate = vueltaLlegadaDate[2] + '/' + vueltaLlegadaDate[1] + '/' + vueltaLlegadaDate[0];
		let vueltaLlegadaTime = vueltaLlegadaFull[1].substring(0, 5);
		
		let vuelta = "\n\n🛬 VUELO DE VUELTA\n\n\t\t\tSalida: " + vueltaSalidaDate + " " +vueltaSalidaTime + 
		"\n\t\t\tLlegada: " + vueltaLlegadaDate + " " + vueltaLlegadaTime + "\n\t\t\tEscalas: " + transfersVUELTA
		
		result.message = ida + vuelta
		result.departureDate = idaSalidaDate
		result.returnDate = vueltaSalidaDate
	}
	
	return result;
	 
 }

 bot.command('menu', (ctx) => replyMenu(ctx))
 
 
 bot.on('message', async (ctx) => {   
     try {
		//console.log(ctx.message)
        const getUser = await DBclient.get(ctx.message.chat.id);
        var obj = JSON.parse(getUser);
        didntUnderstand(obj, ctx)         
     }catch (error) {
 		console.error(error);
        errorMessage(ctx);
 	 }
})
 
 //seleccionar respuesta random de un array 
 bot.on(['sticker', 'photo'], (ctx) => ctx.reply('👍'))
 
 bot.on('callback_query', async (ctx) => {
 	//ctx.reply('👍')
 	const clicked = ctx.callbackQuery.data;
 	
    if(clicked == '🏠 Menú' ||  clicked == '❌ Cancelar') {
 		replyMenu(ctx);
 		clearUserAndSetState(ctx.callbackQuery.from.id, 'start');
        
    } else if(clicked == '🔎 Buscar vuelo') {
        ctx.reply('Genial, vamos a buscar tu nueva aventura😝\n\nA continuación indícame qué tipo de viaje vas a realizar👇', Keyboard.inline(['↗️ Solo ida', '🔄 Ida y vuelta']))
        clearUserAndSetState(ctx.callbackQuery.from.id, 'startSearch');
        
    } else if(clicked == '🔄 Ida y vuelta') {
 		let getUser = await DBclient.get(ctx.callbackQuery.from.id)
 		if(getUser != null) {
 			var obj = JSON.parse(getUser)
 			obj.data.type = 2
 			DBclient.set(ctx.callbackQuery.from.id, JSON.stringify(obj))
 		}
 		ctx.reply('Perfecto, buena  decisión 😉. Ahora necesitaré que me digas desde donde vas a salir y a donde vas separados por un guión. Ejemplo: Barcelona - Londres')
 	
        
    } else if(clicked == '↗️ Solo ida') {
 		ctx.reply('Perfecto, buena  decisión 😉. Ahora necesitaré que me digas desde donde vas a salir y a donde vas separados por un guión. Ejemplo: Barcelona - Londres')
 	
		
	}else if(clicked == '➕ Mostrar más'){
		moreResults(ctx)
	
	}else if(clicked == '💛 Guardar en Favoritos'){
		//const number_keyboard = Keyboard.make(['#1', '#2', '#3', '#4', '#5'], {columns: 2}).reply()
		ctx.reply('Muy bien. Ahora indícame el número 🔢 del viaje que deseas guardar (enviando un mensaje). Una vez guardado,'+
		' me encargaré de revisarlo periodicamente y si veo que baja de precio te avisaré.')
		clearUserAndSetState(ctx.callbackQuery.from.id, 'addFav')
		
	}else if(clicked == '🌟 Favoritos'){
		await ctx.reply('Estos son los vuelos que has guardado en Favoritos. De esta manera, si el precio del vuelo baja me encargaré de avisarte👇');
		showFavs(ctx)
		
	}else if (clicked == '💸 Propina'){
		let msg_propina = "Este bot🤖 ha sido desarrollado de forma independiente por mí (@ferran_dev). Esto significa que no he recibido "
		+ "ningún tipo de financiación para crearlo, por lo que te agradecería enormemente un pequeño aporte económico si mi bot te ha " +  
		"sido útil 😊. A continuación te muestro varias formas con las que puedes dar una propina: \n\n" + 
		'<a href="https://www.paypal.me/99fer">💸 PAYPAL</a> \n\n' +
		'<a href="https://www.buymeacoffee.com/ferranm99">💳 TARJETA / GPAY / APPLE PAY</a> \n\n' +
		'<a href="https://www.blockchain.com/btc/address/bc1qghgu2x9hj3v7j7ncwtxgad08rjlhdm63scvgm9">₿ BITCOIN</a> \n\n' +
		'<a href="https://etherscan.io/address/0x7EE78282885169293bF66947131F414AE680dfE2">⧫ ETHEREUM</a> \n\n'
		
		ctx.replyWithHTML(msg_propina, { disable_web_page_preview: true})
		
	}else if(clicked == '🗑️ Eliminar Favorito'){
		ctx.reply('A continuación, escríbeme el número del ítem que quieres eliminar del listado de favoritos 👇')
		clearUserAndSetState(ctx.callbackQuery.from.id, 'delFav')
	
	}else if(clicked == '⚙️ Ajustes'){
		ctx.reply('Hey! De momento no tenemos ajustes disponibles, pero en un futuro añadiremos algunas opciones como cambiar el idioma o modificar la frecuencia de las notificaciones 🛠️👷‍♂️')
	}
 	
 	console.log(clicked)
 	return ctx.answerCbQuery(clicked)
 })
 
 
 bot.launch() //-------------------------------LAUNCH ------------------------------------------------------
 
 
 function replyMenu(ctx) {
 	ctx.reply('Selecciona una de las siguientes opciones porfavor', menu_keyboard.inline())
 }
 
 async function showFavs(ctx){
	try{
		const getUser = await DBclient.get(ctx.callbackQuery.from.id);
 		var obj = JSON.parse(getUser);
		
		if(obj.favs.length == 0) ctx.reply('Lo siento, de momento no tienes ningún vuelo guardado en Favoritos. Para ello, selecciona la opción "Buscar Vuelo" del menú principal y guarda en Favoritos el vuelo que desees vigilar🧐', menu_keyboard.inline())
			
		else{
			 let message = "<b>Tu listado de Favoritos es el siguiente: </b>\n\n" 
			 for(let i = 0; i < obj.favs.length; i++){
				 let current = obj.favs[i]
				 message += "⭐" + (i+1) + " " + current.origin + " - " + current.destiny
				 + "\n\t\t 🤑 Precio: " + current.price + " €"
				 + "\n\t\t 🛫 Salida: " + current.departureDate
				 
				 if(current.returnDate != "")  message += "\n\t\t 🛬 Vuelta: " + current.returnDate
				
				 message += '\n\t\t<a href="' + current.link + '">Ver detalles</a>\n\n'
			}
			await ctx.replyWithHTML(message,{ disable_web_page_preview: true})
			ctx.reply('Marca una de estas opciones:',Keyboard.inline(['🗑️ Eliminar Favorito', '🏠 Menú']))
		}	
		 
	} catch (error) {
 		console.error(error);
        errorMessage(ctx);
 	}
	 
}
 
 async function moreResults(ctx){
	try {
 		const getUser = await DBclient.get(ctx.callbackQuery.from.id);
 		var obj = JSON.parse(getUser);
 		if(obj.state == "searchOK") {
            ctx.reply('Vamos a ver...')

 			let res = await searchFlight(obj, ctx)
 			var count = 5;
			let onlyIDA = true
			if(obj.data.type == 2) onlyIDA = false
 			
			let index = getTempItemsPosition(ctx.callbackQuery.from.id)	
			while(count < res.data.length && count < 10) {
 				//enviar cada vuelo en un mensaje
				let parseRoute = getRoute(res.data[count].route, onlyIDA);
				let query = {
					price: res.data[count].price,
					departureDate: parseRoute.departureDate,
					returnDate: parseRoute.returnDate,
					origin: res.data[count].flyFrom,
					destiny: res.data[count].flyTo,
					link: res.data[count].deep_link
				}				
				tempItems[index].items.push(query)

 				await ctx.replyWithHTML( '<b>OPCIÓN NÚMERO #' + (count + 1) + '</b>' + 
				'\n\nVuelo ' + res.data[count].flyFrom + ' - ' + res.data[count].flyTo + 
 				'\n💰 Precio: ' + res.data[count].price + ' EUR' + parseRoute.message + 
				'\n\n\n<a href="' + res.data[count].deep_link + '">' + 'Ver detalles</a>' , { disable_web_page_preview: true})
 				count++;
 			}
 			obj.state = 'searchMore'
 			if(res.data.length > 5){
				ctx.reply('Ahí lo tienes 👌. Marca una de las siguientes opciones para continuar: ', 
						  Keyboard.inline(['🏠 Menú', '💛 Guardar en Favoritos']))
			} 
 			else{
				ctx.reply('Vaya, parece que no hay más resultados. Puedes agregar uno a favoritos y si el precio baja te avisaremos',Keyboard.inline(['🏠 Menú', '💛 Guardar en Favoritos']) )
			} 
 			DBclient.set(ctx.callbackQuery.from.id, JSON.stringify(obj))
			//console.log(JSON.stringify(tempItems))
        }//else didntUnderstand(obj, ctx);
 	} catch (error) {
 		console.error(error);
        errorMessage(ctx);
 	}
 }
 
 function getTempItemsPosition(id){
	 let res = -1;
	 for (let i = 0; i < tempItems.length; i++) {
		 if(tempItems[i].user == id){
			 res = i;
			 break;
		}
	}
	return res;
 }
 
 //SEARCHER LOOP - BUSCA VUELOS MAS BARATOS PARA LOS FAVORITOS DE **TODOS** LOS USUARIOS  --> CADA HORA!!
 
 function searchLoop() {
  
   //1. obtener todas las keys
   
   DBclient.keys('*', async function (err, keys) {
		if (err) return console.log(err);
		
		for(let i = 0; i < keys.length; i++) {
			//console.log(keys[i]);
			try{
				await checkCheaper(keys[i])
				
			}catch(error){
				//console.error(error);
				console.log("key " + keys[i] + " no contiene ningún objeto User")
			}
		}
	});        
    
    tempItems = [];
 }

 setInterval(searchLoop, 3600000); // 5 minutes = 300000, 1h = 3600000

 
 async function searchLoc(name, ctx) {
 	const searchParams = {
 		term: name,
 		locale: 'es-ES',
 		location_types: 'airport',
 		limit: 10,
 		active_only: true
 	};
 	const searchURL = 'https://tequila-api.kiwi.com/locations/query?' + (new URLSearchParams(searchParams)).toString();
 	const options = {
 		method: 'GET',
 		headers: {
 			'Content-Type': 'application/json',
 			'apikey': process.env.TEQUILA_TOKEN
 		}
 	};
    
    let jasonData;
    
 	try {
 		const res = await fetch(searchURL, options);
 		jasonData = await res.json();
 	} catch (error) {
 		console.error(error);
        errorMessage(ctx);
 	}
 	return jasonData;
 }
 
 
 async function searchFlight(user, ctx) {
 	const searchParams = {
 		fly_from: user.data.origin,
 		fly_to: user.data.destiny,
 		date_from: user.data.departureLower,
 		date_to: user.data.departureUpper,
 		adults: user.data.adults,
 		flight_type: 'oneway',
 		locale: 'es',
 		curr: 'EUR',
 		limit: 50
 	};
 	if(user.data.type == 2) {
 		searchParams.return_from = user.data.arrivalLower;
 		searchParams.return_to = user.data.arrivalUpper;
 		searchParams.flight_type = 'round';
 	}
 	const searchURL = 'https://tequila-api.kiwi.com/v2/search?' + (new URLSearchParams(searchParams)).toString();
 	const options = {
 		method: 'GET',
 		headers: {
 			'Content-Type': 'application/json',
 			'apikey': process.env.TEQUILA_TOKEN
 		}
 	};
 	
    let jasonData;
    
    try {
 		const res = await fetch(searchURL, options);
 		jasonData = await res.json();
 	} catch (error) {
 		console.error(error);
        errorMessage(ctx);
 	}
 	//console.log(jasonData.data[0])
 	return jasonData;
 }
 
  async function checkCheaper(id) {
	//console.log(id)
	let getUser = await DBclient.get(id);
	let obj = JSON.parse(getUser);
	let favos = obj.favs;
	
	//POR CADA ITEM EN FAVORITOS DEL USUARIO
	for(let j = 0; j < favos.length; j++) {
		//buscar vuelo a partir de favos[j]
		const searchParams = {
			fly_from: favos[j].origin,
			fly_to: favos[j].destiny,
			date_from: favos[j].departureDate,
			date_to: favos[j].departureDate,
			adults: 1,
			flight_type: 'oneway',
			locale: 'es',
			curr: 'EUR',
			limit: 20
		};
		if(favos[j].returnDate != "") {
			searchParams.return_from = favos[j].returnDate;
			searchParams.return_to = favos[j].returnDate;
			searchParams.flight_type = 'round';
		}
		const searchURL = 'https://tequila-api.kiwi.com/v2/search?' + (new URLSearchParams(searchParams)).toString();
		const options = {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'apikey': process.env.TEQUILA_TOKEN
			}
		};

		try {
			const res = await fetch(searchURL, options);
			let jasonData = await res.json();
			
 			/* Como TEQUILA nos tira los vuelos ordeados por precio, no hace falta hacer todo esto. 
			let prices = [];
			for(let c = 0; c < favos.length; c++) {
				prices.push(jasonData.data[c].price)
			}

			let minPrice = Math.min(prices);	
			let index = prices.indexOf(minPrice);
			
			bot.telegram.sendMessage(id, "El precio más barato que se ha encontrado para tu vuelo " + favos[j].origin + " - " + favos[j].destiny + " es " + minPrice + " index: " + index)*/
			
			if(jasonData.data[0].price <  favos[j].price){
				//Se ha encontrado un vuelo más barato
				bot.telegram.sendMessage(id, "Hey!! Tengo buenas noticias para ti🥳🥳. Tu vuelo guardado " + favos[j].origin + " - " + favos[j].destiny + " ha bajado de precio a " + jasonData.data[0].price + ' euros. Dale un vistazo 👉🏻 <a href= "' + jasonData.data[0].deep_link + '">aquí</a>', {parse_mode: 'HTML',  disable_web_page_preview: true})
				
				//guardar nuevo precio en favs
				obj.favs[j].price = jasonData.data[0].price
				obj.favs[j].link = jasonData.data[0].deep_link
				DBclient.set(id, JSON.stringify(obj))
			
				
			}else if(jasonData.data[0].price >  favos[j].price){
				bot.telegram.sendMessage(id, "Vaya😢, lamaneto decirte que tu vuelo guardado " + favos[j].origin + " - " + favos[j].destiny + " ha subido de precio a " + jasonData.data[0].price + ' euros. Dale un vistazo 👉🏻 <a href= "' + jasonData.data[0].deep_link + '">aquí</a>', {parse_mode: 'HTML',  disable_web_page_preview: true})
				
				//guardar nuevo precio en favs
				obj.favs[j].price = jasonData.data[0].price
				obj.favs[j].link = jasonData.data[0].deep_link
				DBclient.set(id, JSON.stringify(obj))
			} 
			
		} catch (error) {
			console.error(error);
		}
		
	}  
 }
 
 function errorMessage(ctx){
    ctx.reply('Lo siento, algo salió mal 😔. Necesitaré que vuelvas a seleccionar una opción del menú 👇',menu_keyboard.inline())
    clearUserAndSetState(ctx.message.chat.id, 'start')
 }
 
 async function clearUserAndSetState(id, newState){
    let getUser = await DBclient.get(id);
 	if(getUser != null) {
        let obj = JSON.parse(getUser);
        obj.data = blankData.data;
        obj.state = newState;
        DBclient.set(id, JSON.stringify(obj))
 	}else{
        DBclient.set(id, JSON.stringify(blankData)) //si no lo encuentra, crea uno
    }    
 }
 
 function didntUnderstand(obj, ctx){
    let msg = 'Lo siento, los datos introducidos no están en el formato correcto.'; 
    let cancel = Keyboard.inline(['❌ Cancelar']);
     
    if(obj.state == 'start'){
        replyMenu(ctx)   
    }else if(obj.state == 'startSearch'){
        ctx.reply(msg + '\nIntroduce el origen y el destino de tu viaje separados por un guión, o pulsa cancelar para volver al inicio', cancel)
    }else if(obj.state == 'citiesOK'){
        ctx.reply(msg + '\n Introduce la fecha de salida de tu viaje (dd/mm/aaaa), o pulsa cancelar para volver al inicio', cancel)
    }else if((obj.state == 'departureOK' && obj.data.type == 1) || obj.state == 'arrivalOK'){
        ctx.reply(msg + '\n Introduce el número de personas que viajaréis, o pulsa cancelar para volver al inicio', cancel)
    }else if(obj.state == 'departureOK' && obj.data.type == 2){
        ctx.reply(msg + '\n Introduce la fecha de vuelta de tu viaje (dd/mm/aaaa), o pulsa cancelar para volver al inicio', cancel)
    }else{
        //reply simpatic
        ctx.reply('Te sugiero que le des un vistazo a las opciones del menú 🤗', Keyboard.inline(['🏠 Menú']))
    }
}
