const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
// 🔥 PRIMERO IMPORTS
const fs = require('fs');
const path = require('path');
const os = require('os');

// 🔥 LUEGO USO
const DATA_PATH = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(DATA_PATH, { recursive: true });
}

const puppeteer = require('puppeteer');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session'
    }),
    puppeteer: {
        headless: true,
        executablePath: puppeteer.executablePath(),
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let ventas = {};
let usuarios = {};
let historial = {};
let ingresos = {};
let menuIngresos = {};
let CUADRE = {};
let CONFIRM_CIERRE = {};

let ADMINS = new Set(["114783537873144"]);
let IDS_REALES = {};

// Rutas
const ventasFile = path.join(DATA_PATH, 'ventas.json');
const usuariosFile = path.join(DATA_PATH, 'usuarios.json');
const historialFile = path.join(DATA_PATH, 'historial.json');
const ingresosFile = path.join(DATA_PATH, 'ingresos.json');

// 🔥 ARCHIVO BASE (PROYECTO)
const defaultIngresos = path.join(__dirname, 'ingresos.json');

// 🔥 COPIAR SI NO EXISTE (PRIMERO)
if (!fs.existsSync(ingresosFile)) {
    if (fs.existsSync(defaultIngresos)) {
        fs.copyFileSync(defaultIngresos, ingresosFile);
        console.log('📥 ingresos.json copiado a AppData');
    }
}

// 🔥 LUEGO CARGAR (IMPORTANTE)
if (fs.existsSync(ventasFile)) ventas = JSON.parse(fs.readFileSync(ventasFile));
if (fs.existsSync(usuariosFile)) usuarios = JSON.parse(fs.readFileSync(usuariosFile));
if (fs.existsSync(historialFile)) historial = JSON.parse(fs.readFileSync(historialFile));
if (fs.existsSync(ingresosFile)) ingresos = JSON.parse(fs.readFileSync(ingresosFile));

// QR
client.on('qr', async (qr) => {
    console.log('📱 Escanea este QR:');

    const url = await qrcode.toDataURL(qr);
    console.log(url);
});

client.on('ready', () => {
    console.log('Bot listo 🚀');
});

// Guardar
function guardarTodo() {
    fs.writeFileSync(ventasFile, JSON.stringify(ventas, null, 2));
    fs.writeFileSync(usuariosFile, JSON.stringify(usuarios, null, 2));
    fs.writeFileSync(historialFile, JSON.stringify(historial, null, 2));
}

// Fecha
function hoy() {
    return new Date().toISOString().split('T')[0];
}

// 🔥 FUNCION DE CIERRE (REUTILIZABLE)
function hacerCierre() {
    const fecha = hoy();

    if (historial[fecha]) return false; // ya cerrado

    historial[fecha] = {};

    for (let user in ventas) {
        historial[fecha][user] = ventas[user];
    }

    ventas = {};
    guardarTodo();

    return true;
}

function limpiar(id) {
    return (id || '')
        .toString()
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

function esAdmin(id) {
    return ADMINS.has(limpiar(id));
}

client.on('message_create', async msg => {
	
    const texto = msg.body.trim();
	
    const rawID = msg.author || msg.from;
    const usuarioID = rawID.split('@')[0].split(':')[0];
	IDS_REALES[usuarioID] = rawID;
	
    // 🧠 FLUJO DE CUADRE
    if (CUADRE[usuarioID]) {

        const estado = CUADRE[usuarioID];

        switch (estado.paso) {

            case 1: {
                const valor = parseFloat(texto);
                if (isNaN(valor)) {
                    msg.reply('❌ Ingresa un número válido');
                    return;
                }

                estado.data.saldoFinal = valor;
                estado.paso++;
                msg.reply('💵 Ingresa EFECTIVO del sistema');
                break;
            }

            case 2: {
                const valor = parseFloat(texto);
                if (isNaN(valor)) {
                    msg.reply('❌ Ingresa un número válido');
                    return;
                }

                estado.data.efectivoSistema = valor;
                estado.paso++;
                msg.reply('💵 Ingresa EFECTIVO real');
                break;
            }

            case 3: {
                const valor = parseFloat(texto);
                if (isNaN(valor)) {
                    msg.reply('❌ Ingresa un número válido');
                    return;
                }

                estado.data.efectivoReal = valor;
                estado.paso++;
                msg.reply('📱 Ingresa YAPE del sistema');
                break;
            }

            case 4: {
                const valor = parseFloat(texto);
                if (isNaN(valor)) {
                    msg.reply('❌ Ingresa un número válido');
                    return;
                }

                estado.data.yapeSistema = valor;
                estado.paso++;
                msg.reply('📱 Ingresa YAPE real');
                break;
            }

            case 5: {
                const valor = parseFloat(texto);
                if (isNaN(valor)) {
                    msg.reply('❌ Ingresa un número válido');
                    return;
                }

                estado.data.yapeReal = valor;
                estado.paso++;
                msg.reply('💳 Ingresa TARJETA del sistema');
                break;
            }

            case 6: {
                const valor = parseFloat(texto);
                if (isNaN(valor)) {
                    msg.reply('❌ Ingresa un número válido');
                    return;
                }

                estado.data.tarjetaSistema = valor;
                estado.paso++;
                msg.reply('💳 Ingresa TARJETA real');
                break;
            }

            case 7: {
                const valor = parseFloat(texto);
                if (isNaN(valor)) {
                    msg.reply('❌ Ingresa un número válido');
                    return;
                }

                estado.data.tarjetaReal = valor;
                estado.paso++;
                msg.reply('🧾 Ingresa GASTOS (ej: 50 pasaje). Escribe "listo" para terminar');
                break;
            }

            case 8:

                // ✅ TERMINAR GASTOS
                if (texto.toLowerCase() === 'listo') {

                    const d = estado.data;

                    const totalGastos = d.gastos.reduce((a, b) => a + b, 0);
                    const efectivoAjustado = d.efectivoReal + totalGastos;

                    const difEfectivo = efectivoAjustado - d.efectivoSistema;
                    const difYape = d.yapeReal - d.yapeSistema;
                    const difTarjeta = d.tarjetaReal - d.tarjetaSistema;

                    const totalFinal = efectivoAjustado + d.yapeReal + d.tarjetaReal;
                    const difTotal = totalFinal - d.saldoFinal;

                    let r = `📊 *CUADRE DE CAJA*\n\n`;

                    r += `💰 *Sistema:*\n`;
                    r += `Saldo final: S/ ${d.saldoFinal.toFixed(2)}\n`;
                    r += `💵 Efectivo: S/ ${d.efectivoSistema.toFixed(2)}\n`;
                    r += `📲 Yape: S/ ${d.yapeSistema.toFixed(2)}\n`;
                    r += `💳 Tarjeta: S/ ${d.tarjetaSistema.toFixed(2)}\n\n`;

                    r += `🧾 *Cajero:*\n`;
                    r += `💵 Efectivo real: S/ ${d.efectivoReal.toFixed(2)}\n`;

                    // 🔥 LISTA DE GASTOS
                    if (d.gastosTexto.length > 0) {
                        r += `🧾 Gastos:\n`;
                        d.gastosTexto.forEach(g => {
                            r += `- ${g}\n`;
                        });
                        r += `Total gastos: S/ ${totalGastos.toFixed(2)}\n`;
                    }

                    r += `➡️ Efectivo ajustado: S/ ${efectivoAjustado.toFixed(2)} ${Math.abs(difEfectivo) < 0.01 ? '✅' : '❌'}\n\n`;

                    r += `📲 Yape real: S/ ${d.yapeReal.toFixed(2)} ${Math.abs(difYape) < 0.01 ? '✅' : '❌'}\n`;
                    r += `💳 Tarjeta real: S/ ${d.tarjetaReal.toFixed(2)} ${Math.abs(difTarjeta) < 0.01 ? '✅' : '❌'}\n\n`;

                    r += `🧮 Total: S/ ${totalFinal.toFixed(2)}\n`;

                    if (Math.abs(difTotal) < 0.01) {
                        r += `\n✅ CUADRE PERFECTO`;
                    } else if (difTotal > 0) {
                       r += `\n⚠️ SOBRA: S/ ${difTotal.toFixed(2)}`;
                    } else {
                        r += `\n❌ FALTA: S/ ${Math.abs(difTotal).toFixed(2)}`;
                    }

                    // 🔥 DETECTAR CRUCES
                    if (Math.abs(difTotal) < 0.01) {

                        let cruces = '';

                        if (Math.abs(difEfectivo) > 0.01) {
                            cruces += `💵 Efectivo: ${difEfectivo > 0 ? '+' : ''}${difEfectivo.toFixed(2)}\n`;
                        }
                        if (Math.abs(difYape) > 0.01) {
                            cruces += `📲 Yape: ${difYape > 0 ? '+' : ''}${difYape.toFixed(2)}\n`;
                        }
                        if (Math.abs(difTarjeta) > 0.01) {
                            cruces += `💳 Tarjeta: ${difTarjeta > 0 ? '+' : ''}${difTarjeta.toFixed(2)}\n`;
                        }

                        if (cruces) {
                            r += `\n⚠️ Posible cruce detectado:\n${cruces}`;
                        }
                    }

                    msg.reply(r);

                    delete CUADRE[usuarioID];
                    return;
                }

                // ➕ AGREGAR GASTO
                const partes = texto.split(' ');
                const monto = parseFloat(partes[0]);

                if (!isNaN(monto)) {

                    const descripcion = partes.slice(1).join(' ') || 'sin detalle';

                    estado.data.gastos.push(monto);
                    estado.data.gastosTexto.push(`S/ ${monto.toFixed(2)} - ${descripcion}`);

                    const totalParcial = estado.data.gastos.reduce((a, b) => a + b, 0);

                    msg.reply(`➕ Gasto agregado: S/ ${monto.toFixed(2)}\n🧾 Total parcial: S/ ${totalParcial.toFixed(2)}`);

                } else {
                    msg.reply('❌ Usa formato: 50 pasaje o escribe "listo"');
                }

                return;
        }

        return;
    }
	
    // 🧾 INICIAR CUADRE
    if (texto === '/cuadre') {

        if (!usuarios[usuarioID]) {
            msg.reply('⛔ No estás registrado');
            return;
        }

        if (CUADRE[usuarioID]) {
            msg.reply('⚠️ Ya estás en un cuadre en proceso');
            return;
        }

        CUADRE[usuarioID] = {
            paso: 1,
            data: {
                gastos: [],
                gastosTexto: []
            }
        };

        msg.reply('💰 Ingresa tu SALDO FINAL del sistema');
        return;
    }
	
    // 🧹 CANCELAR CUADRE
    if (texto === '/cancelarcuadre') {

        delete CUADRE[usuarioID];

        msg.reply('❌ Cuadre cancelado');
        return;
    }
	
    // ✅ CONFIRMAR / CANCELAR CIERRE
    if (CONFIRM_CIERRE[usuarioID]) {

        const respuesta = texto.toLowerCase();

        if (respuesta === 'si') {

            const fecha = hoy();

            // 🔥 GUARDAR BACKUP ANTES DE BORRAR
            if (!historial["_backup"]) historial["_backup"] = {};
            historial["_backup"][fecha] = JSON.parse(JSON.stringify(ventas));

            const ok = hacerCierre();

            if (!ok) {
                msg.reply('⚠️ El día ya fue cerrado');
            } else {
                msg.reply(`📅 Cierre guardado (${fecha}) ✅`);
            }

        } else if (respuesta === 'no') {

            msg.reply('❌ Cierre cancelado');

        } else {
            msg.reply('❌ Responde con SI o NO');
            return;
        }

        delete CONFIRM_CIERRE[usuarioID];
        return;
    }
	
    // 🔒 HELP
    if (texto === '/help') {
        msg.reply(
    `📋 *Comandos disponibles:*

    👤 Usuarios:
    /Monto
    /total
    /total usuario

    🧠 Consulta:
    /id

    👑 Admin:
    /registrar Nombre ID
    /admin ID
    /removeadmin ID
    /reset
    /cierre
    /reporte`
        );
        return;
    }
	
    // 🔒 ADMIN
    if (texto.startsWith('/admin')) {

        if (!esAdmin(usuarioID)) {
            msg.reply('⛔ Solo admin');
            return;
        }

        const nuevo = limpiar(texto.split(' ')[1]);

        if (!nuevo) {
            msg.reply('❌ Usa: /admin 51999999999');
            return;
        }

        ADMINS.add(nuevo);

        msg.reply(`✅ Admin agregado: ${nuevo}`);
        return;
    }

    // 🔒 REMOVE ADMIN
    if (texto.startsWith('/removeadmin')) {

        if (!esAdmin(usuarioID)) {
            msg.reply('⛔ Solo admin');
            return;
        }

        const id = limpiar(texto.split(' ')[1]);

        if (!ADMINS.has(id)) {
            msg.reply('⚠️ No es admin');
            return;
        }

        ADMINS.delete(id);

        msg.reply(`🗑️ Admin eliminado: ${id}`);
        return;
    }

    // 🔒 LIST ADMIN
    if (texto === '/listadmins') {

        let r = '👑 Lista de admins:\n\n';

        for (let a of ADMINS) {
            r += `• ${a}\n`;
        }

        msg.reply(r);
        return;
    }
	
    // 🔒 RESET
    if (texto.startsWith('/reset')) {

        if (!esAdmin(usuarioID)) {
            msg.reply('⛔ Solo admin');
            return;
        }

        const param = texto.split(' ').slice(1).join(' ').trim();

        // 🔹 RESET GENERAL
        if (!param) {
            ventas = {};
            guardarTodo();
            msg.reply('🔄 Reset general realizado');
            return;
        }

        const p = param.toLowerCase();

        // 🔹 RESET POR NOMBRE
        for (let u in usuarios) {
            if (usuarios[u].toLowerCase() === p) {
                delete ventas[u];
            }
        }

        // 🔹 RESET POR ID / NÚMERO
        const num = limpiar(param);
        if (ventas[num]) {
            delete ventas[num];
        }

        guardarTodo();
        msg.reply(`🔄 Reset aplicado a: ${param}`);
        return;
    }

    // 🔒 REGISTRAR
    if (texto.startsWith('/registrar')) {

        if (!esAdmin(usuarioID)) {
            msg.reply('⛔ Solo el administrador puede registrar');
            return;
        }

        const partes = texto.split(' ');
        const nombre = partes.slice(1, -1).join(' ');
        const numero = partes[partes.length - 1];

        if (!nombre || !numero) {
            msg.reply('❌ Usa: /registrar Juan 51999999999');
            return;
        }

        usuarios[numero] = nombre;
        guardarTodo();

        msg.reply(`✅ ${nombre} registrado`);
        return;
    }
	
    // 🔎 VER ID PROPIO
    if (texto === '/id') {
        msg.reply(`🆔 Tu ID: ${usuarioID}`);
        return;
    }

    // ELIMINAR
    if (texto === '/eliminar') {

        if (!esAdmin(usuarioID)) {
            msg.reply('⛔ Solo admin');
            return;
        }

        if (!msg.hasQuotedMsg) {
            msg.reply('❌ Responde al mensaje de la venta');
            return;
        }

        const quoted = await msg.getQuotedMessage();
        const match = quoted.body.match(/\d+/);

        if (!match) {
            msg.reply('❌ No se encontró ID');
            return;
        }

        const id = parseInt(match[0]);

        let eliminado = false;

        for (let user in ventas) {
            ventas[user] = ventas[user].filter(v => {
                if (v.id === id) {
                    eliminado = true;
                    return false;
                }
                return true;
            });
        }

        guardarTodo();

        if (eliminado) {
            msg.reply('🗑️ Venta eliminada');
            } else {
            msg.reply('⚠️ No se encontró la venta');
        }

        return;
    }
	
    // ⚡ VENTA RÁPIDA (/50)
    if (/^\/\d+(\.\d+)?$/.test(texto)) {

        const monto = parseFloat(texto.slice(1));

        if (!usuarios[usuarioID]) {
            msg.reply('⛔ No estás registrado');
            return;
        }

        const ventaID = Date.now();

        if (!ventas[usuarioID]) ventas[usuarioID] = [];
		
        // 🔥 CONVERTIR SI ERA NÚMERO
        if (!Array.isArray(ventas[usuarioID])) {
            ventas[usuarioID] = [
                { id: Date.now(), monto: Number(ventas[usuarioID]) }
            ];
        }

        ventas[usuarioID].push({
            id: ventaID,
            monto: monto
        });

        guardarTodo();

        msg.reply(`✅ Venta registrada\n🆔 ${ventaID}\n💰 S/ ${monto.toFixed(2)}`);
        return;
    }
	
    // INGRESOS
    if (texto === '/ingresos') {

        const fechas = Object.keys(ingresos);

        if (fechas.length === 0) {
            msg.reply('❌ No hay ingresos registrados');
            return;
        }

        let r = '📅 Selecciona una fecha:\n\n';

        fechas.forEach((f, i) => {
            r += `${i + 1}️⃣ ${f}\n`;
        });

        r += '\n✏️ Responde con el número';

        menuIngresos[usuarioID] = fechas;

        msg.reply(r);
        return;
    }
	
    // MENU INGRESOS	
    if (menuIngresos[usuarioID]) {

        const opcion = parseInt(texto);

        const fechas = menuIngresos[usuarioID];

        if (!isNaN(opcion) && fechas[opcion - 1]) {

            const fecha = fechas[opcion - 1];

            let r = `📦 Ingresos - ${fecha}\n\n`;

            for (let item of ingresos[fecha]) {
                r += `👜 ${item.nombre}\n💰 S/ ${Number(item.precio).toFixed(2)}\n\n`;
            }

            delete menuIngresos[usuarioID];

            msg.reply(r);
            return;
        }
    }

    // ⛔ BLOQUEO
    if (!usuarios[usuarioID]) {
        if (texto.startsWith('/venta') || /^\/\d+/.test(texto)) {
            msg.reply('⛔ No estás registrado');
        }
        return;
    }

    // 💰 VENTA
    if (texto.startsWith('/venta')) {

        const monto = parseFloat(texto.split(' ')[1]);

        if (isNaN(monto)) {
            msg.reply('❌ Usa: /venta 50');
            return;
        }

        if (!usuarios[usuarioID]) {
            msg.reply('⛔ No estás registrado');
            return;
        }

        const ventaID = Date.now();
		
        // 🔥 CONVERTIR SI ERA NÚMERO
        if (!Array.isArray(ventas[usuarioID])) {
            ventas[usuarioID] = [
                { id: Date.now(), monto: Number(ventas[usuarioID]) }
            ];
        }

        if (!ventas[usuarioID]) ventas[usuarioID] = [];

        ventas[usuarioID].push({
            id: ventaID,
            monto: monto
        });

        guardarTodo();

        msg.reply(`✅ Venta registrada\n🆔 ${ventaID}\n💰 S/ ${monto.toFixed(2)}`);
        return;
    }
	
    // 💰 AGREGAR VENTA
    if (texto.startsWith('/agregarventa')) {

        if (!esAdmin(usuarioID)) {
            msg.reply('⛔ Solo admin');
            return;
        }

        const partes = texto.split(' ');
        const numero = limpiar(partes[1]);
        const monto = parseFloat(partes[2]);

        if (!numero || isNaN(monto)) {
            msg.reply('❌ Usa: /agregarventa 51999999999 50');
            return;
        }

        if (!ventas[numero]) ventas[numero] = [];

        ventas[numero].push({
            id: Date.now(),
            monto: monto
        });

        guardarTodo();

        msg.reply(`➕ Venta agregada a ${numero}: S/ ${monto.toFixed(2)}`);
        return;
    }

    // 📊 TOTAL
    if (texto === '/total') {

        let respuesta = '📊 Totales hoy:\n';

        for (let user in ventas) {

            const nombre = usuarios[user] || 'Sin nombre';

            let total = 0;

            // 🔥 SI ES ARRAY (nuevo sistema)
            if (Array.isArray(ventas[user])) {
                total = ventas[user].reduce((acc, v) => acc + v.monto, 0);
            } 
            // 🔥 SI ES NÚMERO (viejo sistema)
            else {
                total = Number(ventas[user]) || 0;
            }

            respuesta += `${nombre}: S/ ${total.toFixed(2)}\n`;
        }

        msg.reply(respuesta);
        return;
    }

    // 📊 TOTAL POR NOMBRE
    if (texto.startsWith('/total ')) {

        const nombreBuscado = texto.split(' ').slice(1).join(' ').toLowerCase();

        let total = 0;

        for (let user in usuarios) {

            if (usuarios[user].toLowerCase() === nombreBuscado) {

                if (Array.isArray(ventas[user])) {
                    total += ventas[user].reduce((acc, v) => acc + v.monto, 0);
                } else {
                    total += Number(ventas[user]) || 0;
                }
            }
        }

        msg.reply(`📊 Total de ${nombreBuscado}: S/ ${total.toFixed(2)}`);
        return;
    }

    // 📅 CIERRE CON CONFIRMACIÓN
    if (texto === '/cierre') {

        if (!esAdmin(usuarioID)) {
            msg.reply('⛔ Solo el admin puede cerrar');
            return;
        }

        CONFIRM_CIERRE[usuarioID] = true;

        msg.reply('⚠️ ¿Seguro que deseas cerrar el día?\n\nEscribe *SI* para confirmar o *NO* para cancelar');
        return;
    }
	
    // ♻️ REVERTIR CIERRE
    if (texto === '/revertircierre') {

        if (!esAdmin(usuarioID)) {
            msg.reply('⛔ Solo admin');
            return;
        }

        const fecha = hoy();

        if (!historial["_backup"] || !historial["_backup"][fecha]) {
            msg.reply('❌ No hay backup disponible para hoy');
            return;
        }

        ventas = JSON.parse(JSON.stringify(historial["_backup"][fecha]));

        delete historial[fecha]; // eliminar cierre
        delete historial["_backup"][fecha]; // eliminar backup

        guardarTodo();

        msg.reply('♻️ Cierre revertido correctamente');
        return;
    }
	
    // ♻️ RESTAURAR CIERRE POR FECHA
    if (texto.startsWith('/restaurar')) {

        if (!esAdmin(usuarioID)) {
            msg.reply('⛔ Solo admin');
            return;
        }

        const partes = texto.split(' ');
        const fecha = partes[1];

        if (!fecha) {
            msg.reply('❌ Usa: /restaurar 2026-04-28');
            return;
        }

        if (!historial[fecha]) {
            msg.reply('❌ No existe ese cierre');
            return;
        }

        // 🔥 RECONSTRUIR VENTAS
        let nuevasVentas = {};

        for (let user in historial[fecha]) {

            const data = historial[fecha][user];

            // 🔹 SI YA ES ARRAY (nuevo formato)
            if (Array.isArray(data)) {
            nuevasVentas[user] = data;
            } 
            // 🔹 SI ES NÚMERO (formato antiguo)
            else {
                nuevasVentas[user] = [
                    {
                        id: Date.now(),
                        monto: Number(data)
                    }
                ];
            }
        }

        ventas = nuevasVentas;

        delete historial[fecha];

        guardarTodo();

        msg.reply(`♻️ Ventas restauradas del ${fecha} correctamente`);
        return;
    }
	
    // 🚑 CIERRE FORZADO (EMERGENCIA)
    if (texto === '/forzarcierre') {

        if (!esAdmin(usuarioID)) {
            msg.reply('⛔ Solo admin');
            return;
        }

        const fecha = hoy();

        // 🔥 GUARDAR EN HISTORIAL
        historial[fecha] = JSON.parse(JSON.stringify(ventas));

        // 🔥 LIMPIAR TODO
        ventas = {};

        guardarTodo();

        msg.reply(`📅 Cierre forzado realizado (${fecha}) 🔥`);
        return;
    }

    // 📊 REPORTE
    if (texto.startsWith('/reporte')) {

        const partes = texto.split(' ');

        // 🔹 POR FECHA
        if (partes.length > 1) {
            const fecha = partes[1];

            if (!historial[fecha]) {
                msg.reply('❌ No hay datos para esa fecha');
                return;
            }

            let respuesta = `📅 ${fecha}\n`;

            for (let user in historial[fecha]) {
                const nombre = usuarios[user];
                respuesta += `${nombre}: S/ ${Number(historial[fecha][user]).toFixed(2)}\n`;
            }

            msg.reply(respuesta);
            return;
        }

        // 🔹 TODO
        let respuesta = '📊 Reporte:\n';

        for (let fecha in historial) {
            respuesta += `\n📅 ${fecha}\n`;

            for (let user in historial[fecha]) {
                const nombre = usuarios[user];
                respuesta += `${nombre}: S/ ${historial[fecha][user]}\n`;
            }
        }

        msg.reply(respuesta);
        return;
    }
});

client.initialize();

// ⏰ AUTO CIERRE 11:59 PM
setInterval(() => {
    const ahora = new Date();
    const hora = ahora.getHours();
    const minuto = ahora.getMinutes();

    if (hora === 23 && minuto === 59) {
        const ok = hacerCierre();

        if (ok) {
            console.log("📅 Cierre automático realizado");
        }
    }
}, 60000);

const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Bot activo 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('🌐 Servidor web activo en puerto', PORT);
});