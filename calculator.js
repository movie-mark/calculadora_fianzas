// Calculadora de Acuerdos de Pago
class PaymentAgreementCalculator {
    constructor() {
        this.debtData = {};
        this.selectedPlan = null;
        this.installments = 1;
        this.webhookUrl = 'https://tu-webhook-n8n.com/webhook/acuerdos-pago'; // Configurar aquí la URL del webhook
        
        this.init();
    }

    init() {
        this.loadUrlParameters();
        this.setupEventListeners();
        this.renderInterface();
    }

    // Cargar parámetros de la URL
    loadUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        const requiredParams = ['capital', 'intereses', 'costos'];
        const missingParams = [];

        // Validar parámetros requeridos
        requiredParams.forEach(param => {
            const value = urlParams.get(param);
            if (!value || isNaN(value) || parseFloat(value) < 0) {
                missingParams.push(param);
            } else {
                this.debtData[param] = parseFloat(value);
            }
        });

        // Cargar parámetros informativos
        this.debtData.fechaInicio = urlParams.get('fechaInicio') || null;
        this.debtData.diasMora = urlParams.get('diasMora') || null;
        this.debtData.cuotaAnterior = urlParams.get('cuotaAnterior') || null;
        
        // Cargar UUID del deudor (no se muestra pero se envía en webhook)
        this.debtData.uuid = urlParams.get('uuid') || null;

        // Mostrar error si faltan parámetros
        if (missingParams.length > 0) {
            this.showError(missingParams);
            return;
        }

        // Mostrar contenido principal
        document.getElementById('main-content').style.display = 'block';
    }

    // Mostrar mensaje de error
    showError(missingParams) {
        const errorDiv = document.getElementById('error-message');
        const paramsList = document.getElementById('missing-params');
        
        missingParams.forEach(param => {
            const li = document.createElement('li');
            li.textContent = `• ${param}`;
            paramsList.appendChild(li);
        });

        errorDiv.style.display = 'block';
    }

    // Configurar event listeners
    setupEventListeners() {
        // Slider para deudas menores a $1M
        const slider = document.getElementById('installments-slider');
        if (slider) {
            slider.addEventListener('input', (e) => {
                this.installments = parseInt(e.target.value);
                this.updateInstallmentsDisplay();
                this.updateCalculations();
            });
        }

        // Slider dinámico para deudas mayores a $1M
        const dynamicSlider = document.getElementById('dynamic-installments-slider');
        if (dynamicSlider) {
            dynamicSlider.addEventListener('input', (e) => {
                this.installments = parseInt(e.target.value);
                this.updateDynamicInstallmentsDisplay();
                this.updateCalculations();
            });
        }

        // Botones de opciones de pago para deudas mayores a $1M
        const paymentOptions = document.querySelectorAll('.payment-option');
        paymentOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const plan = e.currentTarget.dataset.plan;
                const minCuotas = parseInt(e.currentTarget.dataset.minCuotas);
                const maxCuotas = parseInt(e.currentTarget.dataset.maxCuotas);
                this.selectPaymentPlan(plan, minCuotas, maxCuotas);
            });
        });

        // Botón de confirmar acuerdo
        const confirmBtn = document.getElementById('confirm-agreement');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.sendAgreement();
            });
        }
    }

    // Renderizar interfaz según el tipo de deuda
    renderInterface() {
        const totalDebt = this.debtData.capital + this.debtData.intereses + this.debtData.costos;
        
        if (totalDebt >= 1000000) {
            // Deuda mayor o igual a $1M - mostrar opciones de descuento
            document.getElementById('large-debt-options').style.display = 'block';
            document.getElementById('small-debt-options').style.display = 'none';
        } else {
            // Deuda menor a $1M - mostrar slider de cuotas
            document.getElementById('large-debt-options').style.display = 'none';
            document.getElementById('small-debt-options').style.display = 'block';
            this.selectedPlan = 'custom';
        }

        // Mostrar información de deuda
        this.displayDebtInfo();
        this.displayAdditionalInfo();
    }

    // Mostrar información de deuda
    displayDebtInfo() {
        document.getElementById('capital-display').textContent = this.formatCurrency(this.debtData.capital);
        document.getElementById('intereses-display').textContent = this.formatCurrency(this.debtData.intereses);
        document.getElementById('costos-display').textContent = this.formatCurrency(this.debtData.costos);
        
        const total = this.debtData.capital + this.debtData.intereses + this.debtData.costos;
        document.getElementById('total-display').textContent = this.formatCurrency(total);
    }

    // Mostrar información adicional
    displayAdditionalInfo() {
        document.getElementById('fecha-inicio-display').textContent = this.debtData.fechaInicio || '-';
        document.getElementById('dias-mora-display').textContent = this.debtData.diasMora ? `${this.debtData.diasMora} días` : '-';
        document.getElementById('cuota-anterior-display').textContent = this.debtData.cuotaAnterior ? this.formatCurrency(parseFloat(this.debtData.cuotaAnterior)) : '-';
    }

    // Seleccionar plan de pago
    selectPaymentPlan(plan, minCuotas, maxCuotas) {
        // Remover selección anterior
        document.querySelectorAll('.payment-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Seleccionar nueva opción
        const selectedOption = document.querySelector(`[data-plan="${plan}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }

        this.selectedPlan = plan;
        
        // Configurar slider dinámico
        this.setupDynamicSlider(plan, minCuotas, maxCuotas);
        this.updateCalculations();
        this.enableConfirmButton();
    }

    // Configurar slider dinámico
    setupDynamicSlider(plan, minCuotas, maxCuotas) {
        const dynamicSlider = document.getElementById('dynamic-installments-slider');
        const dynamicSliderContainer = document.getElementById('dynamic-slider');
        const sliderLabel = document.getElementById('slider-label');
        
        if (plan === 'contado') {
            // Contado: no mostrar slider
            dynamicSliderContainer.style.display = 'none';
            this.installments = 1;
        } else {
            // Mostrar slider con rango específico
            dynamicSliderContainer.style.display = 'block';
            dynamicSlider.min = minCuotas;
            dynamicSlider.max = maxCuotas;
            dynamicSlider.value = minCuotas;
            this.installments = minCuotas;
            
            // Actualizar label
            sliderLabel.textContent = `Cuotas (${minCuotas}-${maxCuotas}):`;
            
            // Actualizar display
            this.updateDynamicInstallmentsDisplay();
        }
    }

    // Actualizar display del slider dinámico
    updateDynamicInstallmentsDisplay() {
        const value = document.getElementById('dynamic-installments-value');
        if (value) {
            value.textContent = `${this.installments} ${this.installments === 1 ? 'cuota' : 'cuotas'}`;
        }
    }


    // Actualizar display del slider
    updateInstallmentsDisplay() {
        const value = document.getElementById('installments-value');
        if (value) {
            value.textContent = `${this.installments} ${this.installments === 1 ? 'cuota' : 'cuotas'}`;
        }
    }


    // Actualizar cálculos
    updateCalculations() {
        if (!this.selectedPlan) return;

        let capitalToPay = this.debtData.capital;
        let discountAmount = 0;
        let installments = this.installments;

        // Aplicar descuentos según el plan
        if (this.selectedPlan !== 'custom') {
            const discounts = {
                'contado': { discount: 0.30 },
                '6meses': { discount: 0.20 },
                '1año': { discount: 0.10 },
                '2años': { discount: 0.00 }
            };

            const planData = discounts[this.selectedPlan];
            discountAmount = capitalToPay * planData.discount;
            capitalToPay = capitalToPay - discountAmount;
            // installments ya está definido por el slider dinámico
        }

        // Calcular valores
        const installmentValue = installments > 0 ? capitalToPay / installments : capitalToPay;
        const totalCondoned = this.debtData.intereses + this.debtData.costos;
        const totalSaved = discountAmount + totalCondoned;

        // Actualizar display
        this.updateResultsDisplay({
            capitalToPay,
            discountAmount,
            interesesCondonados: this.debtData.intereses,
            costosCondonados: this.debtData.costos,
            totalSaved,
            installmentValue,
            installments
        });
    }

    // Actualizar display de resultados
    updateResultsDisplay(results) {
        document.getElementById('capital-pagar').textContent = this.formatCurrency(results.capitalToPay);
        document.getElementById('descuento-capital').textContent = this.formatCurrency(results.discountAmount);
        document.getElementById('intereses-condonados').textContent = this.formatCurrency(results.interesesCondonados);
        document.getElementById('costos-condonados').textContent = this.formatCurrency(results.costosCondonados);
        document.getElementById('total-ahorro').textContent = this.formatCurrency(results.totalSaved);
        document.getElementById('valor-cuota').textContent = this.formatCurrency(results.installmentValue);
        document.getElementById('numero-cuotas').textContent = results.installments.toString();
    }

    // Habilitar botón de confirmar
    enableConfirmButton() {
        const confirmBtn = document.getElementById('confirm-agreement');
        if (confirmBtn) {
            confirmBtn.disabled = false;
        }
    }

    // Enviar acuerdo vía webhook
    async sendAgreement() {
        const confirmBtn = document.getElementById('confirm-agreement');
        const statusDiv = document.getElementById('webhook-status');
        
        // Deshabilitar botón y mostrar loading
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="btn-text">Enviando...</span><span class="btn-icon">⏳</span>';

        try {
            // Preparar payload
            const payload = this.prepareWebhookPayload();
            
            // Enviar webhook
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Mostrar éxito
                statusDiv.style.display = 'block';
                statusDiv.querySelector('.status-text').textContent = 'Acuerdo enviado exitosamente';
                statusDiv.querySelector('.status-icon').textContent = '✅';
                
                // Resetear botón
                confirmBtn.innerHTML = '<span class="btn-text">Acuerdo Confirmado</span><span class="btn-icon">✅</span>';
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            console.error('Error enviando webhook:', error);
            
            // Mostrar error
            statusDiv.style.display = 'block';
            statusDiv.querySelector('.status-text').textContent = `Error: ${error.message}`;
            statusDiv.querySelector('.status-icon').textContent = '❌';
            
            // Resetear botón
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<span class="btn-text">Reintentar Envío</span><span class="btn-icon">🔄</span>';
        }
    }

    // Preparar payload para webhook
    prepareWebhookPayload() {
        const totalDebt = this.debtData.capital + this.debtData.intereses + this.debtData.costos;
        
        let capitalToPay = this.debtData.capital;
        let discountAmount = 0;
        let installments = this.installments;
        let planName = this.selectedPlan;

        // Aplicar descuentos según el plan
        if (this.selectedPlan !== 'custom') {
            const discounts = {
                'contado': { discount: 0.30, name: 'Contado' },
                '6meses': { discount: 0.20, name: '6 Meses' },
                '1año': { discount: 0.10, name: '1 Año' },
                '2años': { discount: 0.00, name: '2 Años' }
            };

            const planData = discounts[this.selectedPlan];
            discountAmount = capitalToPay * planData.discount;
            capitalToPay = capitalToPay - discountAmount;
            planName = `${planData.name} (${installments} cuotas)`;
        }

        const installmentValue = installments > 0 ? capitalToPay / installments : capitalToPay;
        const totalCondoned = this.debtData.intereses + this.debtData.costos;
        const totalSaved = discountAmount + totalCondoned;

        return {
            capitalOriginal: this.debtData.capital,
            interesesCondonados: this.debtData.intereses,
            costosCondonados: this.debtData.costos,
            totalOriginal: totalDebt,
            capitalAPagar: capitalToPay,
            descuentoCapital: discountAmount,
            totalCondonado: totalCondoned,
            totalAhorro: totalSaved,
            planSeleccionado: planName,
            numeroCuotas: installments,
            valorCuota: installmentValue,
            fechaAcuerdo: new Date().toISOString(),
            datosInformativos: {
                fechaInicioMora: this.debtData.fechaInicio,
                diasMora: this.debtData.diasMora,
                cuotaAnterior: this.debtData.cuotaAnterior
            },
            uuidDeudor: this.debtData.uuid,
            urlOrigen: window.location.href,
            timestamp: Date.now()
        };
    }

    // Formatear moneda
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}

// Inicializar calculadora cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new PaymentAgreementCalculator();
});

// Función auxiliar para debugging (remover en producción)
window.debugCalculator = function() {
    console.log('Calculator Debug Info:');
    console.log('- Debt Data:', window.calculator?.debtData);
    console.log('- Selected Plan:', window.calculator?.selectedPlan);
    console.log('- Installments:', window.calculator?.installments);
    console.log('- Webhook URL:', window.calculator?.webhookUrl);
};
