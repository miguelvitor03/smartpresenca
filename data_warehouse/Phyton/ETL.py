import mysql.connector
import pandas as pd
from datetime import datetime
import logging

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("etl_log.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger()

# Configurações de conexão - ATUALIZE COM SUAS CREDENCIAIS
SOURCE_CONFIG = {
    'host': 'localhost',
    'user': 'root',  # Substitua pelo seu usuário MySQL
    'password': 'Luhar2923',  # Substitua pela sua senha MySQL
    'database': 'Banco_pi'
}

TARGET_CONFIG = {
    'host': 'localhost',
    'user': 'root',  # Substitua pelo seu usuário MySQL
    'password': 'Luhar2923',  # Substitua pela sua senha MySQL
    'database': 'DW_pi'
}

def connect_to_database(config):
    """Cria uma conexão com o banco de dados."""
    try:
        conn = mysql.connector.connect(**config)
        logger.info(f"Conexão estabelecida com {config['database']}")
        return conn
    except mysql.connector.Error as err:
        logger.error(f"Erro ao conectar no banco {config['database']}: {err}")
        raise

def extract_data(conn, table_name):
    """Extrai todos os dados de uma tabela."""
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"SELECT * FROM {table_name}")
        data = cursor.fetchall()
        cursor.close()
        logger.info(f"Extraídos {len(data)} registros da tabela {table_name}")
        return data
    except mysql.connector.Error as err:
        logger.error(f"Erro ao extrair dados da tabela {table_name}: {err}")
        raise

def load_data(conn, table_name, data):
    """Carrega dados em uma tabela de destino usando INSERT IGNORE para evitar duplicações."""
    if not data:
        logger.warning(f"Nenhum dado para carregar na tabela {table_name}")
        return 0
    
    cursor = conn.cursor()
    
    try:
        # Obtém os nomes das colunas e prepara a consulta SQL
        columns = list(data[0].keys())
        placeholders = ", ".join(["%s"] * len(columns))
        columns_str = ", ".join(columns)
        
        # Usa INSERT IGNORE para evitar erros de chave duplicada
        insert_query = f"INSERT IGNORE INTO {table_name} ({columns_str}) VALUES ({placeholders})"
        
        # Prepara os valores para inserção
        values = []
        for row in data:
            row_values = []
            for column in columns:
                value = row.get(column)
                # Converte datetime.date para string se necessário
                if hasattr(value, 'strftime'):
                    value = value.strftime('%Y-%m-%d')
                # Converte datetime.time para string se necessário
                elif hasattr(value, 'hour'):
                    value = value.strftime('%H:%M:%S')
                row_values.append(value)
            values.append(row_values)
        
        # Executa as inserções em lotes
        batch_size = 1000
        total_inserted = 0
        for i in range(0, len(values), batch_size):
            batch = values[i:i+batch_size]
            cursor.executemany(insert_query, batch)
            affected_rows = cursor.rowcount
            total_inserted += affected_rows
            conn.commit()
            logger.info(f"Inseridos {affected_rows} registros em {table_name} (lote {i//batch_size + 1})")
        
        logger.info(f"Total de {total_inserted} registros inseridos em {table_name}")
        return total_inserted
    
    except mysql.connector.Error as err:
        conn.rollback()
        logger.error(f"Erro ao inserir dados em {table_name}: {err}")
        # Debug: mostrar estrutura dos dados em caso de erro
        if data:
            logger.error(f"Colunas: {list(data[0].keys())}")
            logger.error(f"Primeiro registro: {data[0]}")
        raise
    finally:
        cursor.close()

def truncate_table(conn, table_name):
    """Limpa todos os dados de uma tabela antes de inserir novos."""
    try:
        cursor = conn.cursor()
        # Desativa verificação de chaves estrangeiras
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        cursor.execute(f"TRUNCATE TABLE {table_name}")
        # Reativa verificação de chaves estrangeiras
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        conn.commit()
        cursor.close()
        logger.info(f"Tabela {table_name} limpa com sucesso")
    except mysql.connector.Error as err:
        conn.rollback()
        logger.error(f"Erro ao limpar tabela {table_name}: {err}")
        raise

def etl_aluno():
    """ETL para a dimensão Aluno"""
    logger.info("Iniciando ETL para DimAluno")
    source_conn = connect_to_database(SOURCE_CONFIG)
    target_conn = connect_to_database(TARGET_CONFIG)
    
    try:
        # Extração
        alunos = extract_data(source_conn, "aluno")
        
        # Transformação - Sem necessidade de tratamento especial para senha
        # Os dados são copiados diretamente
        
        # Carga
        truncate_table(target_conn, "DimAluno")
        load_data(target_conn, "DimAluno", alunos)
    
    finally:
        source_conn.close()
        target_conn.close()

def etl_professor():
    """ETL para a dimensão Professor"""
    logger.info("Iniciando ETL para DimProfessor")
    source_conn = connect_to_database(SOURCE_CONFIG)
    target_conn = connect_to_database(TARGET_CONFIG)
    
    try:
        # Extração
        professores = extract_data(source_conn, "professor")
        
        # Transformação - Apenas ajustar nome de campo
        for professor in professores:
            if 'idprofessor' in professor:
                professor['id_professor'] = professor['idprofessor']
                del professor['idprofessor']
        
        # Carga
        truncate_table(target_conn, "DimProfessor")
        load_data(target_conn, "DimProfessor", professores)
    
    finally:
        source_conn.close()
        target_conn.close()

def etl_disciplina():
    """ETL para a dimensão Disciplina"""
    logger.info("Iniciando ETL para DimDisciplina")
    source_conn = connect_to_database(SOURCE_CONFIG)
    target_conn = connect_to_database(TARGET_CONFIG)
    
    try:
        # Extração
        disciplinas = extract_data(source_conn, "disciplina")
        
        # Carga (sem transformação necessária)
        truncate_table(target_conn, "DimDisciplina")
        load_data(target_conn, "DimDisciplina", disciplinas)
    
    finally:
        source_conn.close()
        target_conn.close()

def etl_turma():
    """ETL para a dimensão Turma"""
    logger.info("Iniciando ETL para DimTurma")
    source_conn = connect_to_database(SOURCE_CONFIG)
    target_conn = connect_to_database(TARGET_CONFIG)
    
    try:
        # Extração
        turmas = extract_data(source_conn, "turma")
        
        # Carga (sem transformação necessária)
        truncate_table(target_conn, "DimTurma")
        load_data(target_conn, "DimTurma", turmas)
    
    finally:
        source_conn.close()
        target_conn.close()

def etl_localizacao():
    """ETL para a dimensão Localização"""
    logger.info("Iniciando ETL para DimLocalizacao")
    source_conn = connect_to_database(SOURCE_CONFIG)
    target_conn = connect_to_database(TARGET_CONFIG)
    
    try:
        # Extração
        localizacoes = extract_data(source_conn, "localizacao")
        
        # Carga (sem transformação necessária)
        truncate_table(target_conn, "DimLocalizacao")
        load_data(target_conn, "DimLocalizacao", localizacoes)
    
    finally:
        source_conn.close()
        target_conn.close()

def etl_tempo():
    """ETL para a dimensão Tempo"""
    logger.info("Iniciando ETL para DimTempo")
    source_conn = connect_to_database(SOURCE_CONFIG)
    target_conn = connect_to_database(TARGET_CONFIG)
    
    try:
        # Extração
        tempos = extract_data(source_conn, "tempo")
        
        # Carga (sem transformação necessária)
        truncate_table(target_conn, "DimTempo")
        load_data(target_conn, "DimTempo", tempos)
    
    finally:
        source_conn.close()
        target_conn.close()

def etl_presenca():
    """ETL para a fato Presença"""
    logger.info("Iniciando ETL para FatoPresenca")
    source_conn = connect_to_database(SOURCE_CONFIG)
    target_conn = connect_to_database(TARGET_CONFIG)
    
    try:
        # Extração
        presencas = extract_data(source_conn, "presenca")
        
        # Transformação - Ajustar nomes dos campos se necessário
        for presenca in presencas:
            # Mapear campos corretamente
            if 'idprofessor' in presenca:
                presenca['id_professor'] = presenca['idprofessor']
                del presenca['idprofessor']
            
            # Mapear disciplina
            if 'iddisciplina' in presenca:
                presenca['id_disciplina'] = presenca['iddisciplina']
                del presenca['iddisciplina']
            
            # Mapear turma
            if 'idturma' in presenca:
                presenca['id_turma'] = presenca['idturma']
                del presenca['idturma']
        
        # Carga
        truncate_table(target_conn, "FatoPresenca")
        load_data(target_conn, "FatoPresenca", presencas)
    
    finally:
        source_conn.close()
        target_conn.close()

def verify_data_integrity():
    """Verifica a integridade dos dados após a migração."""
    logger.info("Verificando integridade dos dados...")
    
    source_conn = connect_to_database(SOURCE_CONFIG)
    target_conn = connect_to_database(TARGET_CONFIG)
    
    try:
        # Lista de tabelas para verificar
        table_mapping = {
            'aluno': 'DimAluno',
            'professor': 'DimProfessor',
            'disciplina': 'DimDisciplina',
            'turma': 'DimTurma',
            'localizacao': 'DimLocalizacao',
            'tempo': 'DimTempo',
            'presenca': 'FatoPresenca'
        }
        
        source_cursor = source_conn.cursor()
        target_cursor = target_conn.cursor()
        
        for source_table, target_table in table_mapping.items():
            # Contar registros na origem
            source_cursor.execute(f"SELECT COUNT(*) FROM {source_table}")
            source_count = source_cursor.fetchone()[0]
            
            # Contar registros no destino
            target_cursor.execute(f"SELECT COUNT(*) FROM {target_table}")
            target_count = target_cursor.fetchone()[0]
            
            logger.info(f"{source_table} -> {target_table}: {source_count} -> {target_count}")
            
            if source_count != target_count:
                logger.warning(f"Diferença na contagem: {source_table} tem {source_count} registros, mas {target_table} tem {target_count}")
        
        source_cursor.close()
        target_cursor.close()
    
    finally:
        source_conn.close()
        target_conn.close()

def run_full_etl():
    """Executa o processo ETL completo"""
    start_time = datetime.now()
    logger.info("=" * 50)
    logger.info("Iniciando processo ETL completo")
    logger.info("=" * 50)
    
    try:
        # ETL para dimensões (sempre executar primeiro)
        etl_aluno()
        etl_professor()
        etl_disciplina()
        etl_turma()
        etl_localizacao()
        etl_tempo()
        
        # ETL para fatos (deve ser executado após as dimensões)
        etl_presenca()
        
        # Verificar integridade dos dados
        verify_data_integrity()
        
        end_time = datetime.now()
        execution_time = end_time - start_time
        logger.info("=" * 50)
        logger.info(f"Processo ETL concluído com sucesso em {execution_time}")
        logger.info("=" * 50)
    
    except Exception as e:
        logger.error(f"Erro no processo ETL: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise

if __name__ == "__main__":
    # Instalar dependências necessárias:
    # pip install mysql-connector-python pandas
    
    print("ETL - Banco_pi para DW_pi")
    print("Certifique-se de que:")
    print("1. O MySQL Server está rodando")
    print("2. Os bancos Banco_pi e DW_pi existem")
    print("3. As credenciais estão corretas")
    print("4. A biblioteca mysql-connector-python está instalada")
    print()
    
    input("Pressione Enter para continuar...")
    run_full_etl()