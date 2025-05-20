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

// MongoDB Schema para armazenar dados das cidades
const cidadeIbgeSchema = new mongoose.Schema({
  cidade_nome: String,
  populacao: Number,
  uf: String,
  data_consulta: { type: Date, default: Date.now }
});
const CidadeIBGE = mongoose.model('CidadeIBGE', cidadeIbgeSchema);

// Lista de cidades com seus IDs
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

// Função para consultar informações de municípios do IBGE
async function consultarMunicipio(cidadeId, tentativas = 3) {
  try {
    // Endpoint correto para consulta de municípios (localidades)
    const url = `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${cidadeId}`;
    
    console.log(`Consultando informações do município ID: ${cidadeId} - Tentativa ${4 - tentativas}/3`);
    const response = await axios.get(url);
    
    return response.data;
  } catch (error) {
    console.error(`Erro ao consultar município ID ${cidadeId}:`, error.message);
    
    if (tentativas > 1) {
      const tempoEspera = 3000;
      console.log(`Tentando novamente em ${tempoEspera/1000} segundos...`);
      await sleep(tempoEspera);
      return consultarMunicipio(cidadeId, tentativas - 1);
    }
    
    return null;
  }
}

// Função atualizada para obter dados populacionais do IBGE
// API corrigida para usar o censo mais recente disponível
async function consultarPopulacao(cidadeId, tentativas = 3) {
  try {
    // Usando o endpoint correto para o último censo disponível
    const url = `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2022/variaveis/9324?localidades=N6[${cidadeId}]`;
    
    console.log(`Consultando dados populacionais para ID: ${cidadeId} - Tentativa ${4 - tentativas}/3`);
    const response = await axios.get(url);
    
    if (response.data && response.data.length > 0 && 
        response.data[0].resultados && 
        response.data[0].resultados.length > 0 && 
        response.data[0].resultados[0].series && 
        response.data[0].resultados[0].series.length > 0 &&
        response.data[0].resultados[0].series[0].serie &&
        response.data[0].resultados[0].series[0].serie['2022']) {
      
      return response.data[0].resultados[0].series[0].serie['2022'];
    }
    
    return null;
  } catch (error) {
    console.error(`Erro ao consultar população ID ${cidadeId}:`, error.message);
    
    if (tentativas > 1) {
      const tempoEspera = 3000;
      console.log(`Tentando novamente em ${tempoEspera/1000} segundos...`);
      await sleep(tempoEspera);
      return consultarPopulacao(cidadeId, tentativas - 1);
    }
    
    return null;
  }
}

// Função alternativa para buscar população usando API agregados
async function consultarPopulacaoAgregados(cidadeId, tentativas = 3) {
  try {
    // Endpoint alternativo de agregados para Censo 2022
    const url = `https://servicodados.ibge.gov.br/api/v3/agregados/9514/periodos/2022/variaveis/93?localidades=N6[${cidadeId}]`;
    
    console.log(`Tentando consultar população via agregados para ID: ${cidadeId} - Tentativa ${4 - tentativas}/3`);
    const response = await axios.get(url);
    
    // Estrutura de retorno para API de agregados, que pode variar bastante
    if (response.data && response.data.length > 0) {
      const resultados = response.data[0].resultados;
      if (resultados && resultados.length > 0) {
        const series = resultados[0].series;
        if (series && series.length > 0) {
          const dadosCenso = series[0].serie;
          if (dadosCenso && dadosCenso['2022']) {
            return dadosCenso['2022'];
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Erro ao consultar população agregados ID ${cidadeId}:`, error.message);
    
    if (tentativas > 1) {
      const tempoEspera = 3000;
      console.log(`Tentando novamente em ${tempoEspera/1000} segundos...`);
      await sleep(tempoEspera);
      return consultarPopulacaoAgregados(cidadeId, tentativas - 1);
    }
    
    return null;
  }
}

// Dados populacionais fixos baseados no Censo 2022 (como backup)
const populacoesFixas = {
  // São Paulo
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
  
  // Minas Gerais
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
  
  // Primeiro confirma se o município existe
  const dadosMunicipio = await consultarMunicipio(id);
  
  if (!dadosMunicipio) {
    console.log(` FALHA: Município ${nome} (ID: ${id}) não encontrado na API do IBGE`);
    return null;
  }
  
  // Tenta obter população por diferentes métodos
  let populacao = await consultarPopulacao(id);
  
  // Se não conseguiu pelo método principal, tenta o método agregados
  if (!populacao) {
    console.log(`População não encontrada, tentando via API de agregados para ${nome}...`);
    populacao = await consultarPopulacaoAgregados(id);
  }
  
  // Se ainda não conseguiu, usa dados fixos (baseados no Censo 2022)
  if (!populacao && populacoesFixas[nome]) {
    console.log(` APIs do IBGE indisponíveis para ${nome}, usando dados do backup: ${populacoesFixas[nome]}`);
    populacao = populacoesFixas[nome];
  } else if (!populacao) {
    console.log(` População não encontrada para ${nome} em nenhuma API do IBGE e não há valor de backup`);
    return null;
  }
  
  return {
    cidade_nome: nome,
    populacao: parseInt(populacao),
    uf: uf
  };
}

// Função principal
async function integrarIBGE() {
  try {
    console.log("Iniciando integração com IBGE...");
    
    // Conecta ao MySQL
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Luhar2923',  // Atenção: considere usar variáveis de ambiente para senhas
      database: 'DW_pi'
    });
    
    console.log("Conectado ao MySQL com sucesso");

    const cidadesConsultadas = new Set();
    let sucessos = 0;
    let falhas = 0;

    // Você pode ajustar o número de cidades para processar
    let cidadesPraProcessar = cidadesComId;
    // Para limitar a quantidade durante testes:
    // const cidadesPraProcessar = cidadesComId.slice(0, 10);
    
    // Verifica se a tabela existe
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS cidades_populacao (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cidade_nome VARCHAR(100) NOT NULL,
        populacao INT NOT NULL,
        uf CHAR(2) NOT NULL,
        data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (cidade_nome, uf)
      )
    `);
    
    for (const cidade of cidadesPraProcessar) {
      const { nome } = cidade;

      if (cidadesConsultadas.has(nome.toLowerCase())) {
        console.log(`Cidade ${nome} já foi consultada, pulando...`);
        continue;
      }
      
      // Processa a cidade
      const dados = await processarCidade(cidade);
      
      if (dados && !isNaN(dados.populacao)) {
        // Salvar no MongoDB
        const registro = new CidadeIBGE(dados);
        await registro.save();
        console.log(` SUCESSO: ${dados.cidade_nome} - População: ${dados.populacao}`);
        sucessos++;
        
        // Salvar no MySQL também
        try {
          // Insere ou atualiza os dados
          await conn.execute(
            'INSERT INTO cidades_populacao (cidade_nome, populacao, uf) VALUES (?, ?, ?) ' +
            'ON DUPLICATE KEY UPDATE populacao = ?, data_atualizacao = CURRENT_TIMESTAMP',
            [dados.cidade_nome, dados.populacao, dados.uf, dados.populacao]
          );
          console.log(`   Dados também salvos no MySQL`);
        } catch (mysqlError) {
          console.error(`   Erro ao salvar no MySQL:`, mysqlError.message);
        }
      } else {
        console.log(` FALHA: População inválida para ${nome}`);
        falhas++;
      }

      cidadesConsultadas.add(nome.toLowerCase());
      
      // Pequena pausa entre as requisições para evitar sobrecarga na API
      await sleep(2000);
    }

    console.log(`\n==== Resumo da Integração ====`);
    console.log(`Total de cidades processadas: ${cidadesPraProcessar.length}`);
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
integrarIBGE();