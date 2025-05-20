@echo off

REM Defina as variáveis
set USER=root
set PASSWORD=Luhar2923
set DATABASE=dw_pi
set BACKUP_DIR=C:\Users\Windows\Desktop\PI2
set DATE=%DATE:~-4%%DATE:~3,2%%DATE:~0,2%
set BACKUP_FILE=%BACKUP_DIR%\backup_%DATABASE%_%DATE%.sql

REM Comando mysqldump
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u %USER% -p%PASSWORD% %DATABASE% > %BACKUP_FILE%

REM Verifique se o backup foi bem-sucedido
if %ERRORLEVEL% equ 0 (
    echo Backup do banco %DATABASE% foi criado com sucesso em %BACKUP_FILE%
) else (
    echo Falha ao criar o backup do banco %DATABASE%
)

REM Finaliza o script
exit
"""cd C:\Users\Windows\Desktop\PI2"""
""".\backup_mysql.bat""