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

// Schema MongoDB igual ao original
const cidadeIbgeSchema = new mongoose.Schema({
  cidade_nome: String,
  populacao: Number,
  uf: String,
  data_consulta: { type: Date, default: Date.now }
});
const CidadeIBGE = mongoose.model('CidadeIBGE', cidadeIbgeSchema);

async function migrarParaMySQL() {
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
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cidades_populacao (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cidade_nome VARCHAR(100) NOT NULL,
        populacao INT NOT NULL,
        uf CHAR(2) NOT NULL,
        data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (cidade_nome, uf)
      )
    `);
    console.log('Tabela verificada/criada com sucesso');

    console.log('Buscando dados do MongoDB...');
    const cidades = await CidadeIBGE.find();
    console.log(`Encontradas ${cidades.length} cidades no MongoDB`);

    let inseridos = 0;
    let ignorados = 0;
    let erros = 0;

    for (const cidade of cidades) {
      const { cidade_nome, populacao, uf } = cidade;
      const ufAtual = uf || 'SP'; // Default para SP caso não tenha UF

      try {
        // Verificar se já existe na tabela cidades_populacao
        const [rows] = await connection.execute(
          'SELECT * FROM cidades_populacao WHERE cidade_nome = ? AND uf = ?',
          [cidade_nome, ufAtual]
        );

        if (rows.length === 0) {
          // Inserir novo registro
          await connection.execute(
            'INSERT INTO cidades_populacao (cidade_nome, populacao, uf) VALUES (?, ?, ?)',
            [cidade_nome, populacao, ufAtual]
          );
          console.log(`Inserido: ${cidade_nome} (${ufAtual}) - População: ${populacao}`);
          inseridos++;
        } else {
          console.log(`Ignorado (já existe): ${cidade_nome} (${ufAtual})`);
          ignorados++;
        }
      } catch (error) {
        console.error(`Erro ao processar cidade ${cidade_nome}:`, error.message);
        erros++;
      }
    }

    console.log('\n==== Resumo da Migração ====');
    console.log(`Total de cidades processadas: ${cidades.length}`);
    console.log(`Inseridas: ${inseridos}`);
    console.log(`Ignoradas: ${ignorados}`);
    console.log(`Erros: ${erros}`);

    await connection.end();
    console.log('Conexão MySQL fechada');
    
    await mongoose.disconnect();
    console.log('Conexão MongoDB fechada');
    console.log('Migração concluída.');
  } catch (error) {
    console.error('Erro durante a migração:', error);
    process.exit(1);
  }
}

// Executar a migração
migrarParaMySQL();