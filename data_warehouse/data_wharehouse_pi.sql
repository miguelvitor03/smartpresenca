create database DW_pi;
use DW_pi;

-- Criando Dimensão de Aluno
CREATE TABLE DimAluno (
    id_aluno INT PRIMARY KEY,
    nome VARCHAR(255),
    cpf VARCHAR(255),
    data_nascimento DATE,
    sexo VARCHAR(20),
    endereco VARCHAR(255),
    cidade_atual VARCHAR(255),
    curso VARCHAR(255),
    bolsa VARCHAR(255),
    ra INT,
    email VARCHAR(255),
    senha VARCHAR(255) 
);

-- Criando Dimensão de Professor
CREATE TABLE DimProfessor (
    id_professor INT PRIMARY KEY,
    nome VARCHAR(255),
    cpf VARCHAR(255),
    titulacao VARCHAR(255),
    rm INT,
    email VARCHAR(255),
     senha VARCHAR(255) 
);

-- Criando Dimensão de Disciplina
CREATE TABLE DimDisciplina (
    iddisciplina INT PRIMARY KEY,
    nome VARCHAR(255),
    codigo VARCHAR(255),
    curso VARCHAR(255)
);

-- Criando Dimensão de Turma
CREATE TABLE DimTurma (
    idturma INT PRIMARY KEY,
    nome VARCHAR(255),
    ano_semestre VARCHAR(25)
);

-- Criando Dimensão de Localização
CREATE TABLE DimLocalizacao (
    id_localizacao INT PRIMARY KEY,
    sala VARCHAR(50),
    bloco VARCHAR(50),
    campus VARCHAR(100)
);

-- Criando Dimensão de Tempo
CREATE TABLE DimTempo (
    id_tempo INT PRIMARY KEY,
    hora_inicio TIME,
    hora_fim TIME,
    data_aula DATE,
    dia_semana VARCHAR(25),
    mes INT,
    ano INT,
    semestre VARCHAR(25)
);

-- Criando Fato de Presença
CREATE TABLE FatoPresenca (
    id_presenca INT AUTO_INCREMENT PRIMARY KEY,
    id_aluno INT NOT NULL,
    id_disciplina INT NOT NULL,
    id_turma INT NOT NULL,
    id_tempo INT NOT NULL,
    id_professor INT NOT NULL,
    id_localizacao INT NOT NULL,
    data DATE NOT NULL,
    presente BOOLEAN NOT NULL,
    FOREIGN KEY (id_aluno) REFERENCES DimAluno(id_aluno),
    FOREIGN KEY (id_disciplina) REFERENCES DimDisciplina(iddisciplina),
    FOREIGN KEY (id_turma) REFERENCES DimTurma(idturma),
    FOREIGN KEY (id_tempo) REFERENCES DimTempo(id_tempo),
    FOREIGN KEY (id_professor) REFERENCES DimProfessor(id_professor),
    FOREIGN KEY (id_localizacao) REFERENCES DimLocalizacao(id_localizacao)
);
