import mysql.connector
from pymongo import MongoClient
from datetime import datetime

# Conectar ao MySQL
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Luhar2923",
    database="data_pi"
)
cursor = conn.cursor()

# Solicitar ID do aluno
aluno_id = int(input("Digite o ID do aluno: "))

# Buscar nome do aluno
cursor.execute("SELECT nome FROM Dim_aluno WHERE id_aluno = %s", (aluno_id,))
resultado = cursor.fetchone()

# Verifica se o aluno existe
if resultado is None:
    print("Aluno não encontrado.")
    exit()

aluno_nome = resultado[0]

# Buscar disciplinas e presença
cursor.execute("""
    SELECT d.nome, f.data, f.presente
    FROM Fato_presenca f
    JOIN Dim_disciplina d ON f.id_disciplina = d.iddisciplina
    WHERE f.id_aluno = %s
""", (aluno_id,))

presencas = cursor.fetchall()

# Organizar em lista de dicionários
presenca_list = []
for disciplina, data_aula, presente in presencas:
    status = "Presente" if presente == 1 else "Ausente"
    presenca_list.append({
        "disciplina": disciplina,
        "data": data_aula.strftime('%Y-%m-%d'),
        "presenca": status
    })

# Conectar ao MongoDB
mongo = MongoClient("mongodb://localhost:27017")
db = mongo["data_pi_logs"]

# Criar log com nome do aluno + presença por disciplina
log = {
    "aluno_id": aluno_id,
    "nome": aluno_nome,
    "evento": "Login no sistema",
    "timestamp": datetime.now().isoformat(),
    "presencas": presenca_list
}

# Inserir no MongoDB
db.logs.insert_one(log)
print("Log integrado com sucesso.")
