document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("procesar").addEventListener("click", async () => {
        const direccion = document.getElementById("direccion").value;
        const archivos = document.getElementById("archivo").files;

        if (!direccion || archivos.length === 0) {
            alert("Por favor, ingresa una dirección y selecciona al menos un archivo.");
            return;
        }

        console.log(`📂 ${archivos.length} archivos seleccionados`);
        const zip = new JSZip();

        let archivosProcesados = 0;

        // Procesar cada archivo
        for (let archivo of archivos) {
            console.log(`📄 Procesando: ${archivo.name}`);

            const reader = new FileReader();
            reader.readAsArrayBuffer(archivo);

            reader.onload = async (event) => {
                try {
                    const buffer = event.target.result;
                    console.log("📄 Cargando documento .docx...");

                    const zipFile = new window.PizZip(buffer);

                    // Configurar docxtemplater
                    const doc = new window.docxtemplater(zipFile, {
                        delimiters: { start: "[[" , end: "]]" },
                        paragraphLoop: true,
                        parser: tag => ({ get: scope => scope[tag] }),
                        nullGetter: () => "",
                        linebreaks: true
                    });

                    // Reemplazar [[direccion]] en el documento
                    doc.render({ direccion });

                    // Generar el nuevo archivo .docx
                    const blob = new Blob([doc.getZip().generate({ type: "arraybuffer" })], {
                        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    });

                    // Agregar archivo al ZIP con el mismo nombre original
                    zip.file(archivo.name, blob);
                    console.log(`✅ ${archivo.name} añadido al ZIP`);

                    archivosProcesados++;

                    // Si todos los archivos han sido procesados, generar y descargar el ZIP
                    if (archivosProcesados === archivos.length) {
                        zip.generateAsync({ type: "blob" }).then((zipBlob) => {
                            window.saveAs(zipBlob, "memorias_actualizadas.zip");
                            console.log("📦 ZIP descargado: memorias_actualizadas.zip");
                        });
                    }
                } catch (error) {
                    console.error(`❌ Error al procesar ${archivo.name}:`, error);
                    alert(`Hubo un error con el archivo: ${archivo.name}`);
                }
            };

            reader.onerror = (error) => {
                console.error(`❌ Error al leer ${archivo.name}:`, error);
                alert(`Error al leer el archivo: ${archivo.name}`);
            };
        }
    });
});
