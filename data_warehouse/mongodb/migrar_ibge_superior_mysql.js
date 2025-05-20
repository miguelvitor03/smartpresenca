const mongoose = require('mongoose');
const mysql = require('mysql2/promise');

// Conexão com MongoDB
mongoose.connect('mongodb://localhost:27017/logsDB')
  .then(() => {
    console.log('Conectado ao MongoDB com sucesso');
  }).catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err);
    process.exit(1);
  });

// Schema MongoDB para dados de ensino superior
// Observe que no primeiro arquivo você enviou, o schema não incluía percentual_ensino_superior
const cidadeEnsinoSuperiorSchema = new mongoose.Schema({
  cidade_nome: String,
  populacao_total: Number,
  populacao_ensino_superior: Number,
  uf: String,
  data_consulta: { type: Date, default: Date.now }
});
const CidadeEnsinoSuperior = mongoose.model('CidadeEnsinoSuperior', cidadeEnsinoSuperiorSchema);

async function migrarDadosEnsinoSuperiorParaMySQL() {
  try {
    console.log('Conectando ao MySQL...');
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Luhar2923',
      database: 'DW_pi'
    });
    console.log('Conectado ao MySQL');

    // Verificar se a tabela existe e criá-la se não existir
    // Modificando para não incluir o percentual_ensino_superior conforme o primeiro arquivo
    await connection.execute(`
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
    console.log('Tabela verificada/criada com sucesso');

    console.log('Buscando dados de ensino superior do MongoDB...');
    const cidadesComDadosEducacionais = await CidadeEnsinoSuperior.find();
    console.log(`Encontradas ${cidadesComDadosEducacionais.length} cidades com dados de ensino superior no MongoDB`);

    let inseridos = 0;
    let atualizados = 0;
    let ignorados = 0;
    let erros = 0;

    for (const cidade of cidadesComDadosEducacionais) {
      const { cidade_nome, populacao_total, populacao_ensino_superior, uf } = cidade;
      const ufAtual = uf || 'SP'; // Default para SP caso não tenha UF

      try {
        // Verificar se já existe na tabela cidades_ensino_superior
        const [rows] = await connection.execute(
          'SELECT * FROM cidades_ensino_superior WHERE cidade_nome = ? AND uf = ?',
          [cidade_nome, ufAtual]
        );

        if (rows.length === 0) {
          // Inserir novo registro - removendo percentual_ensino_superior
          await connection.execute(
            'INSERT INTO cidades_ensino_superior (cidade_nome, populacao_total, populacao_ensino_superior, uf) VALUES (?, ?, ?, ?)',
            [cidade_nome, populacao_total, populacao_ensino_superior, ufAtual]
          );
          console.log(`Inserido: ${cidade_nome} (${ufAtual}) - População: ${populacao_total} - Ensino Superior: ${populacao_ensino_superior}`);
          inseridos++;
        } else {
          // Atualizar registro existente apenas se os valores forem diferentes
          const registroExistente = rows[0];
          if (
            registroExistente.populacao_total !== populacao_total || 
            registroExistente.populacao_ensino_superior !== populacao_ensino_superior
          ) {
            await connection.execute(
              'UPDATE cidades_ensino_superior SET populacao_total = ?, populacao_ensino_superior = ?, data_atualizacao = CURRENT_TIMESTAMP WHERE cidade_nome = ? AND uf = ?',
              [populacao_total, populacao_ensino_superior, cidade_nome, ufAtual]
            );
            console.log(`Atualizado: ${cidade_nome} (${ufAtual}) - População: ${populacao_total} - Ensino Superior: ${populacao_ensino_superior}`);
            atualizados++;
          } else {
            console.log(`Ignorado (sem alterações): ${cidade_nome} (${ufAtual})`);
            ignorados++;
          }
        }
      } catch (error) {
        console.error(`Erro ao processar cidade ${cidade_nome}:`, error.message);
        erros++;
      }
    }

    console.log('\n==== Resumo da Migração ====');
    console.log(`Total de cidades processadas: ${cidadesComDadosEducacionais.length}`);
    console.log(`Inseridas: ${inseridos}`);
    console.log(`Atualizadas: ${atualizados}`);
    console.log(`Ignoradas (sem alterações): ${ignorados}`);
    console.log(`Erros: ${erros}`);

    await connection.end();
    console.log('Conexão MySQL fechada');
    
    await mongoose.disconnect();
    console.log('Conexão MongoDB fechada');
    console.log('Migração de dados de ensino superior concluída.');
  } catch (error) {
    console.error('Erro durante a migração:', error);
    process.exit(1);
  }
}

// Executar a migração
migrarDadosEnsinoSuperiorParaMySQL();