import os
import sys
import platform

def is_dev():
    """Определяет, запущено ли приложение в режиме разработки"""
    return os.environ.get('NODE_ENV') == 'development'

def get_app_path():
    """Получает базовый путь приложения"""
    if is_dev():
        # return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        return os.getcwd()
    
    # В упакованном приложении
    if platform.system() == 'Darwin':  # macOS
        return os.path.join(os.environ.get('RESOURCE_PATH', ''), 'app.asar')
    else:
        return os.path.dirname(sys.executable)
    
def get_resource_path():
    """Получает путь к ресурсам"""
    if is_dev():
        # return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        return os.getcwd()
    
    # В упакованном приложении
    return os.environ.get('RESOURCE_PATH', '')

def get_models_path():
    """Получает путь к моделям"""
    return os.path.join(get_resource_path(), 'models')

def get_python_executable_path(executable_name):
    """Получает путь к исполняемым файлам Python"""
    if is_dev():
        # return os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'dist', executable_name)
        return os.path.join(os.getcwd(), 'dist', executable_name)
    
    # В упакованном приложении
    return os.path.join(get_resource_path(), 'dist', executable_name)

def get_port_file_path():
    """Получает путь к файлу с портом"""
    return os.path.join(get_resource_path(), 'port.txt')

def get_log_file_path():
    """Получает путь к файлу логов"""
    return os.path.join(get_resource_path(), 'server.log') 