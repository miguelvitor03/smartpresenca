const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const axios = require('axios');

// Conexão com MongoDB
mongoose.connect('mongodb://localhost:27017/logsDB')
.then(() => {
  console.log('Conectado ao MongoDB com sucesso');
}).catch(err => {
  console.error('Erro ao conectar ao MongoDB:', err);
  process.exit(1);
});

// MongoDB Schema para armazenar dados de ensino superior por cidade - removida referência ao percentual
const cidadeEnsinoSuperiorSchema = new mongoose.Schema({
  cidade_nome: String,
  populacao_total: Number,
  populacao_ensino_superior: Number,
  uf: String,
  data_consulta: { type: Date, default: Date.now }
});
const CidadeEnsinoSuperior = mongoose.model('CidadeEnsinoSuperior', cidadeEnsinoSuperiorSchema);

// Lista de cidades com seus IDs (mesma lista do arquivo original)
const cidadesComId = [
  { id: 3500303, nome: 'Aguaí', uf: 'SP' },
  { id: 3500402, nome: 'Águas da Prata', uf: 'SP' },
  { id: 3501905, nome: 'Amparo', uf: 'SP' },
  { id: 3501608, nome: 'Americana', uf: 'SP' },
  { id: 3503307, nome: 'Araras', uf: 'SP' },
  { id: 3509502, nome: 'Campinas', uf: 'SP' },
  { id: 3508702, nome: 'Caconde', uf: 'SP' },
  { id: 3510807, nome: 'Casa Branca', uf: 'SP' },
  { id: 3512209, nome: 'Conchal', uf: 'SP' },
  { id: 3513702, nome: 'Descalvado', uf: 'SP' },
  { id: 3513900, nome: 'Divinolândia', uf: 'SP' },
  { id: 3557303, nome: 'Estiva Gerbi', uf: 'SP' },
  { id: 3519055, nome: 'Holambra', uf: 'SP' },
  { id: 3519071, nome: 'Hortolândia', uf: 'SP' },
  { id: 3522604, nome: 'Itapira', uf: 'SP' },
  { id: 3523800, nome: 'Itobi', uf: 'SP' },
  { id: 3524709, nome: 'Jaguariúna', uf: 'SP' },
  { id: 3526704, nome: 'Leme', uf: 'SP' },
  { id: 3526902, nome: 'Limeira', uf: 'SP' },
  { id: 3530706, nome: 'Mogi Guaçu', uf: 'SP' },
  { id: 3530805, nome: 'Mogi Mirim', uf: 'SP' },
  { id: 3536505, nome: 'Paulínia', uf: 'SP' },
  { id: 3537107, nome: 'Pedreira', uf: 'SP' },
  { id: 3539301, nome: 'Pirassununga', uf: 'SP' },
  { id: 3540705, nome: 'Porto Ferreira', uf: 'SP' },
  { id: 3543907, nome: 'Rio Claro', uf: 'SP' },
  { id: 3546306, nome: 'Santa Cruz das Palmeiras', uf: 'SP' },
  { id: 3547502, nome: 'Santa Rita do Passa Quatro', uf: 'SP' },
  { id: 3548104, nome: 'Santo Antônio do Jardim', uf: 'SP' },
  { id: 3548906, nome: 'São Carlos', uf: 'SP' },
  { id: 3549102, nome: 'São João da Boa Vista', uf: 'SP' },
  { id: 3549706, nome: 'São José do Rio Pardo', uf: 'SP' },
  { id: 3550803, nome: 'São Sebastião da Grama', uf: 'SP' },
  { id: 3551603, nome: 'Serra Negra', uf: 'SP' },
  { id: 3552403, nome: 'Sumaré', uf: 'SP' },
  { id: 3553302, nome: 'Tambaú', uf: 'SP' },
  { id: 3553609, nome: 'Tapiratiba', uf: 'SP' },
  { id: 3556206, nome: 'Valinhos', uf: 'SP' },
  { id: 3556404, nome: 'Vargem Grande do Sul', uf: 'SP' },
  { id: 3556701, nome: 'Vinhedo', uf: 'SP' },
  { id: 3101607, nome: 'Alfenas', uf: 'MG' },
  { id: 3102605, nome: 'Andradas', uf: 'MG' },
  { id: 3104304, nome: 'Areado', uf: 'MG' },
  { id: 3106200, nome: 'Belo Horizonte', uf: 'MG' },
  { id: 3107109, nome: 'Boa Esperança', uf: 'MG' },
  { id: 3108404, nome: 'Botelhos', uf: 'MG' },
  { id: 3109501, nome: 'Cabo Verde', uf: 'MG' },
  { id: 3110301, nome: 'Caldas', uf: 'MG' },
  { id: 3111002, nome: 'Campestre', uf: 'MG' },
  { id: 3128709, nome: 'Guaxupé', uf: 'MG' },
  { id: 3134905, nome: 'Jacutinga', uf: 'MG' },
  { id: 3139003, nome: 'Machado', uf: 'MG' },
  { id: 3143401, nome: 'Monte Sião', uf: 'MG' },
  { id: 3144102, nome: 'Muzambinho', uf: 'MG' },
  { id: 3146008, nome: 'Ouro Fino', uf: 'MG' },
  { id: 3147907, nome: 'Passos', uf: 'MG' },
  { id: 3151800, nome: 'Poços de Caldas', uf: 'MG' },
  { id: 3152501, nome: 'Pouso Alegre', uf: 'MG' },
  { id: 3164704, nome: 'São Sebastião do Paraíso', uf: 'MG' },
  { id: 3169307, nome: 'Três Corações', uf: 'MG' },
  { id: 3169406, nome: 'Três Pontas', uf: 'MG' }
];

// Função auxiliar para esperar um tempo determinado
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para consultar a população total do município
async function consultarPopulacaoTotal(cidadeId, tentativas = 3) {
  try {
    // Usando o endpoint para o último censo disponível
    const url = `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2022/variaveis/9324?localidades=N6[${cidadeId}]`;
    
    console.log(`Consultando população total para ID: ${cidadeId} - Tentativa ${4 - tentativas}/3`);
    const response = await axios.get(url);
    
    if (response.data && response.data.length > 0 && 
        response.data[0].resultados && 
        response.data[0].resultados.length > 0 && 
        response.data[0].resultados[0].series && 
        response.data[0].resultados[0].series.length > 0 &&
        response.data[0].resultados[0].series[0].serie &&
        response.data[0].resultados[0].series[0].serie['2022']) {
      
      return parseInt(response.data[0].resultados[0].series[0].serie['2022']);
    }
    
    return null;
  } catch (error) {
    console.error(`Erro ao consultar população total ID ${cidadeId}:`, error.message);
    
    if (tentativas > 1) {
      const tempoEspera = 3000;
      console.log(`Tentando novamente em ${tempoEspera/1000} segundos...`);
      await sleep(tempoEspera);
      return consultarPopulacaoTotal(cidadeId, tentativas - 1);
    }
    
    return null;
  }
}

// Função para consultar a população com ensino superior
async function consultarPopulacaoEnsinoSuperior(cidadeId, tentativas = 3) {
  try {
    // Endpoint para dados de educação - ensino superior completo
    // Usando o Censo 2022 com o código da variável para ensino superior completo
    const url = `https://servicodados.ibge.gov.br/api/v3/agregados/1384/periodos/2022/variaveis/1000093?localidades=N6[${cidadeId}]`;
    
    console.log(`Consultando população com ensino superior para ID: ${cidadeId} - Tentativa ${4 - tentativas}/3`);
    const response = await axios.get(url);
    
    // Extrai o valor da resposta seguindo a estrutura da API
    if (response.data && response.data.length > 0 && 
        response.data[0].resultados && 
        response.data[0].resultados.length > 0 && 
        response.data[0].resultados[0].series && 
        response.data[0].resultados[0].series.length > 0 &&
        response.data[0].resultados[0].series[0].serie &&
        response.data[0].resultados[0].series[0].serie['2022']) {
      
      return parseInt(response.data[0].resultados[0].series[0].serie['2022']);
    }
    
    return null;
  } catch (error) {
    console.error(`Erro ao consultar população com ensino superior ID ${cidadeId}:`, error.message);
    
    if (tentativas > 1) {
      const tempoEspera = 3000;
      console.log(`Tentando novamente em ${tempoEspera/1000} segundos...`);
      await sleep(tempoEspera);
      return consultarPopulacaoEnsinoSuperior(cidadeId, tentativas - 1);
    }
    
    return null;
  }
}

// Função alternativa para buscar dados educacionais
async function consultarDadosEducacionais(cidadeId, tentativas = 3) {
  try {
    // Endpoint alternativo para dados educacionais
    const url = `https://servicodados.ibge.gov.br/api/v3/agregados/1383/periodos/2022/variaveis/93?localidades=N6[${cidadeId}]&classificacao=2[5]`;
    
    console.log(`Tentando consulta alternativa para educação superior ID: ${cidadeId} - Tentativa ${4 - tentativas}/3`);
    const response = await axios.get(url);
    
    // Extrai o valor da resposta seguindo a estrutura da API
    if (response.data && response.data.length > 0) {
      const resultados = response.data[0].resultados;
      if (resultados && resultados.length > 0) {
        const series = resultados[0].series;
        if (series && series.length > 0) {
          const dadosEducacao = series[0].serie;
          if (dadosEducacao && dadosEducacao['2022']) {
            return parseInt(dadosEducacao['2022']);
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Erro ao consultar dados educacionais ID ${cidadeId}:`, error.message);
    
    if (tentativas > 1) {
      const tempoEspera = 3000;
      console.log(`Tentando novamente em ${tempoEspera/1000} segundos...`);
      await sleep(tempoEspera);
      return consultarDadosEducacionais(cidadeId, tentativas - 1);
    }
    
    return null;
  }
}

// Dados de valores absolutos (não percentuais) de ensino superior como backup
// Calculados a partir das estimativas percentuais e população total do backup
const ensinoSuperiorAbsoluto = {
  // Cidades SP - valores absolutos (não percentuais)
  'Aguaí': 4515, // 37313 * 0.121
  'Águas da Prata': 1103, // 8170 * 0.135
  'Amparo': 11047, // 72677 * 0.152
  'Americana': 49130, // 242018 * 0.203
  'Araras': 24859, // 132934 * 0.187
  'Campinas': 316819, // 1223237 * 0.259
  'Caconde': 2003, // 19077 * 0.105
  'Casa Branca': 4241, // 30734 * 0.138
  'Conchal': 3167, // 28276 * 0.112
  'Descalvado': 4781, // 33910 * 0.141
  'Divinolândia': 1065, // 10864 * 0.098
  'Estiva Gerbi': 1235, // 11542 * 0.107
  'Holambra': 3436, // 15272 * 0.225
  'Hortolândia': 38328, // 235144 * 0.163
  'Itapira': 11543, // 74474 * 0.155
  'Itobi': 742, // 7896 * 0.094
  'Jaguariúna': 11976, // 60486 * 0.198
  'Leme': 14921, // 104346 * 0.143
  'Limeira': 56144, // 308482 * 0.182
  'Mogi Guaçu': 25863, // 153033 * 0.169
  'Mogi Mirim': 16295, // 93650 * 0.174
  'Paulínia': 23185, // 112003 * 0.207
  'Pedreira': 7076, // 48463 * 0.146
  'Pirassununga': 13113, // 76239 * 0.172
  'Porto Ferreira': 8447, // 55942 * 0.151
  'Rio Claro': 41186, // 208008 * 0.198
  'Santa Cruz das Palmeiras': 4147, // 34271 * 0.121
  'Santa Rita do Passa Quatro': 3982, // 27464 * 0.145
  'Santo Antônio do Jardim': 605, // 5935 * 0.102
  'São Carlos': 61840, // 254484 * 0.243
  'São João da Boa Vista': 16975, // 91759 * 0.185
  'São José do Rio Pardo': 8681, // 54946 * 0.158
  'São Sebastião da Grama': 1269, // 12202 * 0.104
  'Serra Negra': 4623, // 28534 * 0.162
  'Sumaré': 43218, // 286211 * 0.151
  'Tambaú': 2997, // 23235 * 0.129
  'Tapiratiba': 1476, // 13066 * 0.113
  'Valinhos': 28997, // 131210 * 0.221
  'Vargem Grande do Sul': 5821, // 42486 * 0.137
  'Vinhedo': 19334, // 78913 * 0.245
  
  // Cidades MG - valores absolutos (não percentuais)
  'Alfenas': 15839, // 79996 * 0.198
  'Andradas': 6044, // 41396 * 0.146
  'Areado': 1882, // 15174 * 0.124
  'Belo Horizonte': 663171, // 2521564 * 0.263
  'Boa Esperança': 5684, // 40028 * 0.142
  'Botelhos': 1821, // 15435 * 0.118
  'Cabo Verde': 1547, // 14196 * 0.109
  'Caldas': 1643, // 14283 * 0.115
  'Campestre': 2250, // 21024 * 0.107
  'Guaxupé': 9114, // 52078 * 0.175
  'Jacutinga': 3299, // 24619 * 0.134
  'Machado': 6829, // 42413 * 0.161
  'Monte Sião': 3067, // 23238 * 0.132
  'Muzambinho': 3329, // 21067 * 0.158
  'Ouro Fino': 4923, // 33953 * 0.145
  'Passos': 21107, // 115337 * 0.183
  'Poços de Caldas': 37776, // 168641 * 0.224
  'Pouso Alegre': 32058, // 154872 * 0.207
  'São Sebastião do Paraíso': 12134, // 71799 * 0.169
  'Três Corações': 14743, // 81453 * 0.181
  'Três Pontas': 8766  // 56554 * 0.155
};

// Dados populacionais fixos baseados no Censo 2022 (backup do arquivo original)
const populacoesFixas = {
  'Aguaí': 37313,
  'Águas da Prata': 8170,
  'Amparo': 72677,
  'Americana': 242018,
  'Araras': 132934,
  'Campinas': 1223237,
  'Caconde': 19077,
  'Casa Branca': 30734,
  'Conchal': 28276,
  'Descalvado': 33910,
  'Divinolândia': 10864,
  'Estiva Gerbi': 11542,
  'Holambra': 15272,
  'Hortolândia': 235144,
  'Itapira': 74474,
  'Itobi': 7896,
  'Jaguariúna': 60486,
  'Leme': 104346,
  'Limeira': 308482,
  'Mogi Guaçu': 153033,
  'Mogi Mirim': 93650,
  'Paulínia': 112003,
  'Pedreira': 48463,
  'Pirassununga': 76239,
  'Porto Ferreira': 55942,
  'Rio Claro': 208008,
  'Santa Cruz das Palmeiras': 34271,
  'Santa Rita do Passa Quatro': 27464,
  'Santo Antônio do Jardim': 5935,
  'São Carlos': 254484,
  'São João da Boa Vista': 91759,
  'São José do Rio Pardo': 54946,
  'São Sebastião da Grama': 12202,
  'Serra Negra': 28534,
  'Sumaré': 286211,
  'Tambaú': 23235,
  'Tapiratiba': 13066,
  'Valinhos': 131210,
  'Vargem Grande do Sul': 42486,
  'Vinhedo': 78913,
  'Alfenas': 79996,
  'Andradas': 41396,
  'Areado': 15174,
  'Belo Horizonte': 2521564,
  'Boa Esperança': 40028,
  'Botelhos': 15435,
  'Cabo Verde': 14196,
  'Caldas': 14283,
  'Campestre': 21024,
  'Guaxupé': 52078,
  'Jacutinga': 24619,
  'Machado': 42413,
  'Monte Sião': 23238,
  'Muzambinho': 21067,
  'Ouro Fino': 33953,
  'Passos': 115337,
  'Poços de Caldas': 168641,
  'Pouso Alegre': 154872,
  'São Sebastião do Paraíso': 71799,
  'Três Corações': 81453,
  'Três Pontas': 56554
};

// Função principal para processar uma cidade
async function processarCidade(cidade) {
  const { id, nome, uf } = cidade;
  
  console.log(`\n==== Processando cidade: ${nome} (${uf}) ====`);
  
  // Busca população total
  let populacaoTotal = await consultarPopulacaoTotal(id);
  
  // Se não encontrar população total, usa o backup
  if (!populacaoTotal && populacoesFixas[nome]) {
    console.log(` API do IBGE indisponível para população total de ${nome}, usando dados do backup: ${populacoesFixas[nome]}`);
    populacaoTotal = populacoesFixas[nome];
  } else if (!populacaoTotal) {
    console.log(` População total não encontrada para ${nome}`);
    return null;
  }
  
  // Busca população com ensino superior
  let populacaoSuperior = await consultarPopulacaoEnsinoSuperior(id);
  
  // Se não conseguiu com o método principal, tenta o método alternativo
  if (!populacaoSuperior) {
    console.log(`População com ensino superior não encontrada, tentando método alternativo para ${nome}...`);
    populacaoSuperior = await consultarDadosEducacionais(id);
  }
  
  // Se ainda não conseguiu, usa os dados absolutos pre-calculados do backup
  if (!populacaoSuperior && ensinoSuperiorAbsoluto[nome]) {
    populacaoSuperior = ensinoSuperiorAbsoluto[nome];
    console.log(` APIs do IBGE indisponíveis para dados educacionais de ${nome}, usando valor absoluto de backup: ${populacaoSuperior} pessoas`);
  } else if (!populacaoSuperior) {
    console.log(` Dados de ensino superior não encontrados para ${nome} em nenhuma API do IBGE e não há valor de backup`);
    return null;
  }
  
  return {
    cidade_nome: nome,
    populacao_total: populacaoTotal,
    populacao_ensino_superior: populacaoSuperior,
    uf: uf
  };
}

// Função principal
async function integrarDadosEnsinoSuperior() {
  try {
    console.log("Iniciando integração de dados de ensino superior com IBGE...");
    
    // Conecta ao MySQL
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Luhar2923',  // Considere usar variáveis de ambiente para senhas
      database: 'DW_pi'
    });
    
    console.log("Conectado ao MySQL com sucesso");

    const cidadesConsultadas = new Set();
    let sucessos = 0;
    let falhas = 0;

    // Cria tabela de ensino superior se não existir - removido percentual da tabela
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS cidades_ensino_superior (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cidade_nome VARCHAR(100) NOT NULL,
        populacao_total INT NOT NULL,
        populacao_ensino_superior INT NOT NULL,
        uf CHAR(2) NOT NULL,
        data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (cidade_nome, uf)
      )
    `);
    
    // Processa cada cidade
    for (const cidade of cidadesComId) {
      const { nome } = cidade;

      if (cidadesConsultadas.has(nome.toLowerCase())) {
        console.log(`Cidade ${nome} já foi consultada, pulando...`);
        continue;
      }
      
      // Processa a cidade
      const dados = await processarCidade(cidade);
      
      if (dados && !isNaN(dados.populacao_total) && !isNaN(dados.populacao_ensino_superior)) {
        // Salvar no MongoDB
        const registro = new CidadeEnsinoSuperior(dados);
        await registro.save();
        console.log(` SUCESSO: ${dados.cidade_nome} - População total: ${dados.populacao_total} - Com ensino superior: ${dados.populacao_ensino_superior}`);
        sucessos++;
        
        // Salvar no MySQL também
        try {
          // Insere ou atualiza os dados - removido percentual
          await conn.execute(
            'INSERT INTO cidades_ensino_superior (cidade_nome, populacao_total, populacao_ensino_superior, uf) VALUES (?, ?, ?, ?) ' +
            'ON DUPLICATE KEY UPDATE populacao_total = ?, populacao_ensino_superior = ?, data_atualizacao = CURRENT_TIMESTAMP',
            [
              dados.cidade_nome, 
              dados.populacao_total, 
              dados.populacao_ensino_superior,
              dados.uf,
              dados.populacao_total,
              dados.populacao_ensino_superior
            ]
          );
          console.log(`   Dados também salvos no MySQL`);
        } catch (mysqlError) {
          console.error(`   Erro ao salvar no MySQL:`, mysqlError.message);
        }
      } else {
        console.log(` FALHA: Dados inválidos para ${nome}`);
        falhas++;
      }

      cidadesConsultadas.add(nome.toLowerCase());
      
      // Pequena pausa entre as requisições para evitar sobrecarga na API
      await sleep(2000);
    }

    console.log(`\n==== Resumo da Integração ====`);
    console.log(`Total de cidades processadas: ${cidadesComId.length}`);
    console.log(`Sucessos: ${sucessos}`);
    console.log(`Falhas: ${falhas}`);

    await conn.end();
    console.log("Conexão MySQL fechada");
    
    await mongoose.disconnect();
    console.log("Conexão MongoDB fechada");
    
  } catch (error) {
    console.error("Erro durante a integração:", error);
  }
}

// Executar o programa
integrarDadosEnsinoSuperior();