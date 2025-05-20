const mongoose = require('mongoose');
const readline = require('readline');
const mysql = require('mysql2/promise');

// Configuração do readline para entrada de dados
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Conexão com MongoDB
mongoose.connect('mongodb://localhost:27017/logsDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("Conectado ao MongoDB"))
.catch(err => console.error("Erro ao conectar ao MongoDB:", err));

// Conexão com MySQL (Data Warehouse)
const mysqlConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Luhar2923',
  database: 'DW_pi'
};

let mysqlConnection;

async function conectarMySQL() {
  try {
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log("Conectado ao MySQL Data Warehouse");
    return mysqlConnection;
  } catch (err) {
    console.error("Erro ao conectar ao MySQL:", err);
    throw err;
  }
}

// Schemas e Models MongoDB
const { Schema } = mongoose;

// Schema do Aluno
const alunoSchema = new Schema({
  nome: String,
  ra: { type: String, unique: true },
  dataCadastro: { type: Date, default: Date.now }
});

const Aluno = mongoose.model('Aluno', alunoSchema);

// Schema do Professor
const professorSchema = new Schema({
  nome: String,
  rm: { type: String, unique: true },
  dataCadastro: { type: Date, default: Date.now }
});

const Professor = mongoose.model('Professor', professorSchema);

// Log de Acesso Aluno
const logAcessoAlunoSchema = new Schema({
  alunoId: { type: Schema.Types.ObjectId, ref: 'Aluno' },
  nome: String,
  ra: String,
  ip: String,
  data: { type: Date, default: Date.now },
  status: String,
  descricao: String,
});

const LogAcessoAluno = mongoose.model('LogAcessoAluno', logAcessoAlunoSchema);

// Log de Acesso Professor
const logAcessoProfessorSchema = new Schema({
  professorId: { type: Schema.Types.ObjectId, ref: 'Professor' },
  nome: String,
  rm: String,
  ip: String,
  data: { type: Date, default: Date.now },
  status: String,
  descricao: String,
});

const LogAcessoProfessor = mongoose.model('LogAcessoProfessor', logAcessoProfessorSchema);

// Log de Erro Aluno
const logErroAlunoSchema = new Schema({
  mensagem: String,
  stackTrace: String,
  data: { type: Date, default: Date.now },
  alunoId: { type: Schema.Types.ObjectId, ref: 'Aluno' },
  nome: String,
  ra: String,
});

const LogErroAluno = mongoose.model('LogErroAluno', logErroAlunoSchema);

// Log de Erro Professor
const logErroProfessorSchema = new Schema({
  mensagem: String,
  stackTrace: String,
  data: { type: Date, default: Date.now },
  professorId: { type: Schema.Types.ObjectId, ref: 'Professor' },
  nome: String,
  rm: String,
});

const LogErroProfessor = mongoose.model('LogErroProfessor', logErroProfessorSchema);

// Log de Tentativa Inválida
const logTentativaInvalidaSchema = new Schema({
  nome: String,
  identificador: String, // RA ou RM
  tipoUsuario: String, // "aluno" ou "professor"
  ip: String,
  tentativa: String,
  data: { type: Date, default: Date.now },
  motivo: String,
});

const LogTentativaInvalida = mongoose.model('LogTentativaInvalida', logTentativaInvalidaSchema);

// Funções para registrar logs no MongoDB
async function registrarAcessoAluno(aluno, ip, status, descricao) {
  const log = new LogAcessoAluno({ 
    alunoId: aluno._id, 
    nome: aluno.nome, 
    ra: aluno.ra,
    ip, 
    status, 
    descricao 
  });
  await log.save();
  console.log("Log de acesso de aluno salvo com sucesso no MongoDB.");
  
  // Também enviar para MySQL Data Warehouse
  await enviarAcessoAlunoParaMySQL(aluno, ip, status, descricao);
}

async function registrarAcessoProfessor(professor, ip, status, descricao) {
  const log = new LogAcessoProfessor({ 
    professorId: professor._id, 
    nome: professor.nome, 
    rm: professor.rm,
    ip, 
    status, 
    descricao 
  });
  await log.save();
  console.log("Log de acesso de professor salvo com sucesso no MongoDB.");
  
  // Também enviar para MySQL Data Warehouse
  await enviarAcessoProfessorParaMySQL(professor, ip, status, descricao);
}

async function registrarErroAluno(mensagem, stackTrace, aluno) {
  const log = new LogErroAluno({ 
    mensagem, 
    stackTrace, 
    alunoId: aluno._id,
    nome: aluno.nome,
    ra: aluno.ra
  });
  await log.save();
  console.log("Log de erro de aluno salvo com sucesso no MongoDB.");
  
  // Também enviar para MySQL Data Warehouse
  await enviarErroAlunoParaMySQL(mensagem, stackTrace, aluno);
}

async function registrarErroProfessor(mensagem, stackTrace, professor) {
  const log = new LogErroProfessor({ 
    mensagem, 
    stackTrace, 
    professorId: professor._id,
    nome: professor.nome,
    rm: professor.rm
  });
  await log.save();
  console.log("Log de erro de professor salvo com sucesso no MongoDB.");
  
  // Também enviar para MySQL Data Warehouse
  await enviarErroProfessorParaMySQL(mensagem, stackTrace, professor);
}

async function registrarTentativaInvalida(nome, identificador, tipoUsuario, ip, tentativa, motivo) {
  const log = new LogTentativaInvalida({ 
    nome, 
    identificador, 
    tipoUsuario, 
    ip, 
    tentativa, 
    motivo 
  });
  await log.save();
  console.log(`Tentativa inválida de ${tipoUsuario} registrada com sucesso no MongoDB.`);
  
  // Enviar para MySQL
  if (tipoUsuario === 'aluno') {
    const alunoObj = { nome, ra: identificador, _id: null };
    await enviarErroAlunoParaMySQL(`Tentativa inválida de ${tentativa}`, motivo, alunoObj);
  } else if (tipoUsuario === 'professor') {
    const professorObj = { nome, rm: identificador, _id: null };
    await enviarErroProfessorParaMySQL(`Tentativa inválida de ${tentativa}`, motivo, professorObj);
  }
}

// Função para enviar logs de acesso de aluno para o MySQL Data Warehouse
async function enviarAcessoAlunoParaMySQL(aluno, ip, status, descricao) {
  try {
    if (!mysqlConnection) {
      await conectarMySQL();
    }
    
    const dataAtual = new Date();
    const query = `
      INSERT INTO LogAcessosAlunos (
        ra_aluno, 
        nome_aluno, 
        data_acesso, 
        ip,
        status,
        descricao
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const valores = [
      aluno.ra,
      aluno.nome,
      dataAtual,
      ip,
      status,
      descricao
    ];
    
    await mysqlConnection.execute(query, valores);
    console.log("Log de acesso de aluno enviado para o Data Warehouse MySQL.");
  } catch (err) {
    console.error("Erro ao enviar log de acesso de aluno para MySQL:", err);
  }
}

// Função para enviar logs de acesso de professor para o MySQL Data Warehouse
async function enviarAcessoProfessorParaMySQL(professor, ip, status, descricao) {
  try {
    if (!mysqlConnection) {
      await conectarMySQL();
    }
    
    const dataAtual = new Date();
    const query = `
      INSERT INTO LogAcessosProfessores (
        rm_professor, 
        nome_professor, 
        data_acesso, 
        ip,
        status,
        descricao
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const valores = [
      professor.rm,
      professor.nome,
      dataAtual,
      ip,
      status,
      descricao
    ];
    
    await mysqlConnection.execute(query, valores);
    console.log("Log de acesso de professor enviado para o Data Warehouse MySQL.");
  } catch (err) {
    console.error("Erro ao enviar log de acesso de professor para MySQL:", err);
  }
}

// Função para enviar logs de erro de aluno para o MySQL Data Warehouse
async function enviarErroAlunoParaMySQL(mensagem, stackTrace, aluno) {
  try {
    if (!mysqlConnection) {
      await conectarMySQL();
    }
    
    const dataAtual = new Date();
    const query = `
      INSERT INTO LogErrosAlunos (
        ra_aluno, 
        nome_aluno, 
        data_erro, 
        mensagem_erro, 
        stack_trace, 
        origem
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const valores = [
      aluno.ra,
      aluno.nome,
      dataAtual,
      mensagem,
      stackTrace,
      'Sistema de Logs Acadêmicos'
    ];
    
    await mysqlConnection.execute(query, valores);
    console.log("Log de erro de aluno enviado para o Data Warehouse MySQL.");
  } catch (err) {
    console.error("Erro ao enviar log de erro de aluno para MySQL:", err);
  }
}

// Função para enviar logs de erro de professor para o MySQL Data Warehouse
async function enviarErroProfessorParaMySQL(mensagem, stackTrace, professor) {
  try {
    if (!mysqlConnection) {
      await conectarMySQL();
    }
    
    const dataAtual = new Date();
    const query = `
      INSERT INTO LogErrosProfessores (
        rm_professor, 
        nome_professor, 
        data_erro, 
        mensagem_erro, 
        stack_trace, 
        origem
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const valores = [
      professor.rm,
      professor.nome,
      dataAtual,
      mensagem,
      stackTrace,
      'Sistema de Logs Acadêmicos'
    ];
    
    await mysqlConnection.execute(query, valores);
    console.log("Log de erro de professor enviado para o Data Warehouse MySQL.");
  } catch (err) {
    console.error("Erro ao enviar log de erro de professor para MySQL:", err);
  }
}

// Função para verificar se RA existe no Data Warehouse MySQL
async function verificarRANoMySQL(ra) {
  try {
    if (!mysqlConnection) {
      await conectarMySQL();
    }
    
    const [rows] = await mysqlConnection.execute(
      'SELECT id_aluno, nome, ra FROM DimAluno WHERE ra = ?',
      [ra]
    );
    
    if (rows.length > 0) {
      return {
        existe: true,
        nome: rows[0].nome,
        ra: rows[0].ra.toString()
      };
    }
    
    return { existe: false };
  } catch (err) {
    console.error("Erro ao verificar RA no MySQL:", err);
    return { existe: false, erro: err.message };
  }
}

// Função para verificar se RM existe no Data Warehouse MySQL
async function verificarRMNoMySQL(rm) {
  try {
    if (!mysqlConnection) {
      await conectarMySQL();
    }
    
    const [rows] = await mysqlConnection.execute(
      'SELECT id_professor, nome, rm FROM DimProfessor WHERE rm = ?',
      [rm]
    );
    
    if (rows.length > 0) {
      return {
        existe: true,
        nome: rows[0].nome,
        rm: rows[0].rm.toString()
      };
    }
    
    return { existe: false };
  } catch (err) {
    console.error("Erro ao verificar RM no MySQL:", err);
    return { existe: false, erro: err.message };
  }
}

// Função para validar RA
function validarRA(ra) {
  return ra && ra.length >= 6;
}

// Função para validar RM
function validarRM(rm) {
  return rm && rm.length >= 5;
}

// Função para validar nome
function validarNome(nome) {
  return nome && nome.trim().length > 0;
}

// Função para encontrar ou criar um aluno
async function encontrarOuCriarAluno(nome, ra) {
  // Primeiro verificar se o aluno existe no MySQL DW
  const raNoMySQL = await verificarRANoMySQL(ra);
  
  if (!raNoMySQL.existe) {
    throw new Error(`RA ${ra} não encontrado. Acesso negado.`);
  }
  
  // Se o aluno existir no MySQL DW, verificar se existe no MongoDB
  let aluno = await Aluno.findOne({ ra });
  
  if (!aluno) {
    // Usar o nome do DW para garantir consistência
    aluno = new Aluno({ nome: raNoMySQL.nome, ra });
    await aluno.save();
    console.log(`Novo aluno cadastrado no MongoDB: ${raNoMySQL.nome} (RA: ${ra})`);
  } else {
    console.log(`Aluno encontrado no MongoDB: ${aluno.nome} (RA: ${aluno.ra})`);
    
    // Atualizar o nome do aluno no MongoDB se for diferente do MySQL
    if (aluno.nome !== raNoMySQL.nome) {
      aluno.nome = raNoMySQL.nome;
      await aluno.save();
      console.log(`Nome do aluno atualizado para: ${raNoMySQL.nome}`);
    }
  }
  
  return aluno;
}

// Função para encontrar ou criar um professor
async function encontrarOuCriarProfessor(nome, rm) {
  // Primeiro verificar se o professor existe no MySQL DW
  const rmNoMySQL = await verificarRMNoMySQL(rm);
  
  if (!rmNoMySQL.existe) {
    throw new Error(`RM ${rm} não encontrado. Acesso negado.`);
  }
  
  // Se o professor existir no MySQL DW, verificar se existe no MongoDB
  let professor = await Professor.findOne({ rm });
  
  if (!professor) {
    // Usar o nome do DW para garantir consistência
    professor = new Professor({ nome: rmNoMySQL.nome, rm });
    await professor.save();
    console.log(`Novo professor cadastrado no MongoDB: ${rmNoMySQL.nome} (RM: ${rm})`);
  } else {
    console.log(`Professor encontrado no MongoDB: ${professor.nome} (RM: ${professor.rm})`);
    
    // Atualizar o nome do professor no MongoDB se for diferente do MySQL
    if (professor.nome !== rmNoMySQL.nome) {
      professor.nome = rmNoMySQL.nome;
      await professor.save();
      console.log(`Nome do professor atualizado para: ${rmNoMySQL.nome}`);
    }
  }
  
  return professor;
}

// Função para verificar RA e senha no Data Warehouse MySQL
async function verificarRAeSenhaNoMySQL(ra, senha) {
  try {
    if (!mysqlConnection) {
      await conectarMySQL();
    }
    
    const [rows] = await mysqlConnection.execute(
      'SELECT id_aluno, nome, ra, senha FROM DimAluno WHERE ra = ?',
      [ra]
    );
    
    if (rows.length > 0) {
      // Verificar se a senha corresponde
      if (rows[0].senha === senha) {
        return {
          autenticado: true,
          nome: rows[0].nome,
          ra: rows[0].ra.toString()
        };
      } else {
        return { autenticado: false, motivo: 'senha_incorreta' };
      }
    }
    
    return { autenticado: false, motivo: 'ra_nao_encontrado' };
  } catch (err) {
    console.error("Erro ao verificar RA e senha no MySQL:", err);
    return { autenticado: false, motivo: 'erro_banco', erro: err.message };
  }
}

// Função para verificar RM e senha no Data Warehouse MySQL
async function verificarRMeSenhaNoMySQL(rm, senha) {
  try {
    if (!mysqlConnection) {
      await conectarMySQL();
    }
    
    const [rows] = await mysqlConnection.execute(
      'SELECT id_professor, nome, rm, senha FROM DimProfessor WHERE rm = ?',
      [rm]
    );
    
    if (rows.length > 0) {
      // Verificar se a senha corresponde
      if (rows[0].senha === senha) {
        return {
          autenticado: true,
          nome: rows[0].nome,
          rm: rows[0].rm.toString()
        };
      } else {
        return { autenticado: false, motivo: 'senha_incorreta' };
      }
    }
    
    return { autenticado: false, motivo: 'rm_nao_encontrado' };
  } catch (err) {
    console.error("Erro ao verificar RM e senha no MySQL:", err);
    return { autenticado: false, motivo: 'erro_banco', erro: err.message };
  }
}

// Função principal que solicita dados do usuário
async function solicitarTipoUsuario() {
  try {
    // Garantir que a conexão com MySQL está estabelecida
    if (!mysqlConnection) {
      await conectarMySQL();
    }
    
    // Criar tabelas de logs se não existirem
    await criarTabelasLog();
    
    console.log('\nEscolha o tipo de usuário:');
    console.log('1 - Aluno');
    console.log('2 - Professor');
    
    rl.question('Digite a opção desejada (1 ou 2): ', (opcao) => {
      if (opcao === '1') {
        solicitarDadosAluno();
      } else if (opcao === '2') {
        solicitarDadosProfessor();
      } else {
        console.log('Opção inválida. Por favor, escolha 1 para Aluno ou 2 para Professor.');
        solicitarTipoUsuario();
      }
    });
  } catch (erro) {
    console.error('Erro ao inicializar o sistema:', erro);
    rl.close();
    await mongoose.disconnect();
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
  }
}

// Função que solicita dados do aluno
async function solicitarDadosAluno() {
  try {
    rl.question('Digite o RA do aluno: ', async (ra) => {
      if (!validarRA(ra)) {
        console.log('RA inválido. O RA deve conter pelo menos 6 caracteres.');
        const ip = '192.168.0.1'; // Em uma aplicação real, você obteria o IP real
        await registrarTentativaInvalida('', ra, 'aluno', ip, 'autenticação', 'RA inválido');
        return solicitarTipoUsuario();
      }

      rl.question('Digite sua senha: ', async (senha) => {
        if (!senha || senha.trim().length === 0) {
          console.log('Senha inválida. A senha não pode estar vazia.');
          const ip = '192.168.0.1';
          await registrarTentativaInvalida('', ra, 'aluno', ip, 'autenticação', 'Senha vazia');
          return solicitarTipoUsuario();
        }

        try {
          // Verificar RA e senha no MySQL
          const verificacao = await verificarRAeSenhaNoMySQL(ra, senha);
          
          if (!verificacao.autenticado) {
            const ip = '192.168.0.1';
            let motivo = 'Erro desconhecido';
            
            if (verificacao.motivo === 'ra_nao_encontrado') {
              console.log(`RA ${ra} não encontrado. Acesso negado.`);
              motivo = 'RA não encontrado';
            } else if (verificacao.motivo === 'senha_incorreta') {
              console.log('Senha incorreta. Acesso negado.');
              motivo = 'Senha incorreta';
            } else if (verificacao.motivo === 'erro_banco') {
              console.log('Erro ao verificar credenciais. Tente novamente.');
              motivo = `Erro de banco de dados: ${verificacao.erro}`;
            }
            
            await registrarTentativaInvalida('', ra, 'aluno', ip, 'autenticação', motivo);
            return solicitarTipoUsuario();
          }

          // Autenticação bem-sucedida - usar dados do DW
          const nome = verificacao.nome;
          try {
            const aluno = await encontrarOuCriarAluno(nome, ra);
            await processarLogsAluno(aluno);
          } catch (erro) {
            console.error('Erro ao processar dados do aluno:', erro.message);
            const alunoObj = { nome, ra, _id: null };
            await registrarErroAluno('Erro ao processar dados do aluno', erro.stack, alunoObj);
            return solicitarTipoUsuario();
          }
        } catch (erro) {
          console.error('Erro ao verificar credenciais no MySQL:', erro.message);
          const alunoObj = { nome: '', ra, _id: null };
          await registrarErroAluno('Erro ao verificar credenciais no MySQL', erro.stack, alunoObj);
          return solicitarTipoUsuario();
        }
      });
    });
  } catch (erro) {
    console.error('Erro ao solicitar dados do aluno:', erro);
    return solicitarTipoUsuario();
  }
}

// Função que solicita dados do professor
async function solicitarDadosProfessor() {
  try {
    rl.question('Digite o RM do professor: ', async (rm) => {
      if (!validarRM(rm)) {
        console.log('RM inválido. O RM deve conter pelo menos 5 caracteres.');
        const ip = '192.168.0.1'; // Em uma aplicação real, você obteria o IP real
        await registrarTentativaInvalida('', rm, 'professor', ip, 'autenticação', 'RM inválido');
        return solicitarTipoUsuario();
      }

      rl.question('Digite sua senha: ', async (senha) => {
        if (!senha || senha.trim().length === 0) {
          console.log('Senha inválida. A senha não pode estar vazia.');
          const ip = '192.168.0.1';
          await registrarTentativaInvalida('', rm, 'professor', ip, 'autenticação', 'Senha vazia');
          return solicitarTipoUsuario();
        }

        try {
          // Verificar RM e senha no MySQL
          const verificacao = await verificarRMeSenhaNoMySQL(rm, senha);
          
          if (!verificacao.autenticado) {
            const ip = '192.168.0.1';
            let motivo = 'Erro desconhecido';
            
            if (verificacao.motivo === 'rm_nao_encontrado') {
              console.log(`RM ${rm} não encontrado . Acesso negado.`);
              motivo = 'RM não encontrado';
            } else if (verificacao.motivo === 'senha_incorreta') {
              console.log('Senha incorreta. Acesso negado.');
              motivo = 'Senha incorreta';
            } else if (verificacao.motivo === 'erro_banco') {
              console.log('Erro ao verificar credenciais. Tente novamente.');
              motivo = `Erro de banco de dados: ${verificacao.erro}`;
            }
            
            await registrarTentativaInvalida('', rm, 'professor', ip, 'autenticação', motivo);
            return solicitarTipoUsuario();
          }

          // Autenticação bem-sucedida - usar dados do DW
          const nome = verificacao.nome;
          try {
            const professor = await encontrarOuCriarProfessor(nome, rm);
            await processarLogsProfessor(professor);
          } catch (erro) {
            console.error('Erro ao processar dados do professor:', erro.message);
            const professorObj = { nome, rm, _id: null };
            await registrarErroProfessor('Erro ao processar dados do professor', erro.stack, professorObj);
            return solicitarTipoUsuario();
          }
        } catch (erro) {
          console.error('Erro ao verificar credenciais no MySQL:', erro.message);
          const professorObj = { nome: '', rm, _id: null };
          await registrarErroProfessor('Erro ao verificar credenciais no MySQL', erro.stack, professorObj);
          return solicitarTipoUsuario();
        }
      });
    });
  } catch (erro) {
    console.error('Erro ao solicitar dados do professor:', erro);
    return solicitarTipoUsuario();
  }
}

// Criar tabelas de logs no MySQL se não existirem
async function criarTabelasLog() {
  try {
    // Tabela de Logs de Erros de Alunos
    const queryErrosAlunos = `
      CREATE TABLE IF NOT EXISTS LogErrosAlunos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ra_aluno VARCHAR(50),
        nome_aluno VARCHAR(255),
        data_erro DATETIME,
        mensagem_erro TEXT,
        stack_trace TEXT,
        origem VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `;
    
    // Tabela de Logs de Erros de Professores
    const queryErrosProfessores = `
      CREATE TABLE IF NOT EXISTS LogErrosProfessores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rm_professor VARCHAR(50),
        nome_professor VARCHAR(255),
        data_erro DATETIME,
        mensagem_erro TEXT,
        stack_trace TEXT,
        origem VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `;
    
    // Tabela de Logs de Acessos de Alunos
    const queryAcessosAlunos = `
      CREATE TABLE IF NOT EXISTS LogAcessosAlunos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ra_aluno VARCHAR(50),
        nome_aluno VARCHAR(255),
        data_acesso DATETIME,
        ip VARCHAR(50),
        status VARCHAR(50),
        descricao TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `;
    
    // Tabela de Logs de Acessos de Professores
    const queryAcessosProfessores = `
      CREATE TABLE IF NOT EXISTS LogAcessosProfessores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rm_professor VARCHAR(50),
        nome_professor VARCHAR(255),
        data_acesso DATETIME,
        ip VARCHAR(50),
        status VARCHAR(50),
        descricao TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `;
    
    await mysqlConnection.execute(queryErrosAlunos);
    await mysqlConnection.execute(queryErrosProfessores);
    await mysqlConnection.execute(queryAcessosAlunos);
    await mysqlConnection.execute(queryAcessosProfessores);
    
    console.log("Tabelas de logs verificadas/criadas no MySQL.");
  } catch (err) {
    console.error("Erro ao criar tabelas de logs no MySQL:", err);
  }
}

// Processar os logs após autenticação bem-sucedida de aluno
async function processarLogsAluno(aluno) {
  const ip = '192.168.0.1'; // Em uma aplicação real, você obteria o IP real
  
  console.log(`\nBem-vindo, Aluno ${aluno.nome}!`);

  try {
    // Gerar log de acesso bem-sucedido
    await registrarAcessoAluno(aluno, ip, 'sucesso', 'Login de aluno realizado com sucesso');
    
    // Simular uma operação que pode causar erro (1 em cada 3 vezes)
    const randomNum = Math.floor(Math.random() * 3);
    if (randomNum === 0) {
      throw new Error('Erro ao carregar dados do sistema para o aluno');
    }
    
    console.log('Todas as operações para o aluno concluídas com sucesso!');
  } catch (erro) {
    console.error('Ocorreu um erro durante o processamento:', erro.message);
    await registrarErroAluno(erro.message, erro.stack, aluno);
  } finally {
    console.log('\nDeseja tentar novamente?');
    rl.question('Digite S para sim ou qualquer outra tecla para sair: ', async (resposta) => {
      if (resposta.toLowerCase() === 's') {
        solicitarTipoUsuario();
      } else {
        console.log('Encerrando o sistema...');
        rl.close();
        await mongoose.disconnect();
        if (mysqlConnection) {
          await mysqlConnection.end();
        }
      }
    });
  }
}

// Processar os logs após autenticação bem-sucedida de professor
async function processarLogsProfessor(professor) {
  const ip = '192.168.0.1'; // Em uma aplicação real, você obteria o IP real
  
  console.log(`\nBem-vindo, Professor ${professor.nome}!`);

  try {
    // Gerar log de acesso bem-sucedido
    await registrarAcessoProfessor(professor, ip, 'sucesso', 'Login de professor realizado com sucesso');
    
    // Simular uma operação que pode causar erro (1 em cada 3 vezes)
    const randomNum = Math.floor(Math.random() * 3);
    if (randomNum === 0) {
      throw new Error('Erro ao carregar dados do sistema para o professor');
    }
    
    console.log('Todas as operações para o professor concluídas com sucesso!');
  } catch (erro) {
    console.error('Ocorreu um erro durante o processamento:', erro.message);
    await registrarErroProfessor(erro.message, erro.stack, professor);
  } finally {
    console.log('\nDeseja tentar novamente?');
    rl.question('Digite S para sim ou qualquer outra tecla para sair: ', async (resposta) => {
      if (resposta.toLowerCase() === 's') {
        solicitarTipoUsuario();
      } else {
        console.log('Encerrando o sistema...');
        rl.close();
        await mongoose.disconnect();
        if (mysqlConnection) {
          await mysqlConnection.end();
        }
      }
    });
  }
}

// Iniciar o sistema
(async function() {
  console.log('=== SISTEMA DE LOGS ACADÊMICOS ===');
  console.log('Por favor, selecione seu tipo de usuário para continuar.\n');
  try {
    await conectarMySQL();
    solicitarTipoUsuario();
  } catch (erro) {
    console.error('Erro ao inicializar o sistema:', erro);
    rl.close();
    await mongoose.disconnect();
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
  }
})();